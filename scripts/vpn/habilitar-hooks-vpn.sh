#!/bin/bash

# Script para habilitar los hooks de OpenVPN
# Ejecutar como root: sudo bash scripts/vpn/habilitar-hooks-vpn.sh

set -e

PROJECT_DIR="/home/cyberpol/web/visitantes.cyberpol.com.py/public_html"
SERVER_CONF="/etc/openvpn/server.conf"
REGISTER_CONNECT_JS="$PROJECT_DIR/scripts/vpn/register-connection.js"
REGISTER_DISCONNECT_JS="$PROJECT_DIR/scripts/vpn/register-disconnect.js"
SYSTEMD_OVERRIDE="/etc/systemd/system/openvpn@server.service.d/override.conf"
ENV_FILE="$PROJECT_DIR/.env"

echo "=========================================="
echo "HABILITAR HOOKS VPN"
echo "=========================================="
echo ""

# 1. Verificar que los scripts existen
echo "1. Verificando scripts..."
echo "-------------------------"
if [ ! -f "$REGISTER_CONNECT_JS" ]; then
    echo "✗ Error: register-connection.js no existe"
    echo "  Compilar con: npx tsc scripts/vpn/register-connection.ts --outDir scripts/vpn --module commonjs --target es2020 --esModuleInterop --skipLibCheck"
    exit 1
fi

if [ ! -f "$REGISTER_DISCONNECT_JS" ]; then
    echo "✗ Error: register-disconnect.js no existe"
    echo "  Compilar con: npx tsc scripts/vpn/register-disconnect.ts --outDir scripts/vpn --module commonjs --target es2020 --esModuleInterop --skipLibCheck"
    exit 1
fi

echo "✓ Scripts encontrados"
echo ""

# 2. Hacer backup de server.conf
echo "2. Haciendo backup de server.conf..."
echo "------------------------------------"
BACKUP_FILE="${SERVER_CONF}.backup.$(date +%Y%m%d_%H%M%S)"
cp "$SERVER_CONF" "$BACKUP_FILE"
echo "✓ Backup creado: $BACKUP_FILE"
echo ""

# 3. Descomentar hooks
echo "3. Descomentando hooks en server.conf..."
echo "----------------------------------------"
# Descomentar client-connect
sed -i 's|^#client-connect "/usr/bin/node /home/cyberpol/web/visitantes.cyberpol.com.py/public_html/scripts/vpn/register-connection.js"|client-connect "/usr/bin/node /home/cyberpol/web/visitantes.cyberpol.com.py/public_html/scripts/vpn/register-connection.js"|' "$SERVER_CONF"

# Descomentar client-disconnect
sed -i 's|^#client-disconnect "/usr/bin/node /home/cyberpol/web/visitantes.cyberpol.com.py/public_html/scripts/vpn/register-disconnect.js"|client-disconnect "/usr/bin/node /home/cyberpol/web/visitantes.cyberpol.com.py/public_html/scripts/vpn/register-disconnect.js"|' "$SERVER_CONF"

echo "✓ Hooks descomentados"
echo ""

# 4. Verificar que los hooks estén activos
echo "4. Verificando hooks activos..."
echo "--------------------------------"
if grep -q "^client-connect" "$SERVER_CONF"; then
    echo "✓ client-connect activo:"
    grep "^client-connect" "$SERVER_CONF" | sed 's/^/  /'
else
    echo "✗ client-connect NO está activo"
fi

if grep -q "^client-disconnect" "$SERVER_CONF"; then
    echo "✓ client-disconnect activo:"
    grep "^client-disconnect" "$SERVER_CONF" | sed 's/^/  /'
else
    echo "✗ client-disconnect NO está activo"
fi
echo ""

# 5. Sincronizar VPN_API_TOKEN entre .env y override.conf
echo "5. Sincronizando VPN_API_TOKEN..."
echo "---------------------------------"
if [ -f "$ENV_FILE" ] && grep -q "VPN_API_TOKEN" "$ENV_FILE"; then
    TOKEN_FROM_ENV=$(grep "^VPN_API_TOKEN=" "$ENV_FILE" | cut -d'=' -f2 | tr -d '"' | tr -d "'" | tr -d ' ' | head -1)
    
    if [ -n "$TOKEN_FROM_ENV" ]; then
        echo "✓ Token encontrado en .env"
        
        # Actualizar override.conf con el token de .env
        if [ -f "$SYSTEMD_OVERRIDE" ]; then
            # Crear nuevo override.conf con el token correcto
            mkdir -p "$(dirname "$SYSTEMD_OVERRIDE")"
            cat > "$SYSTEMD_OVERRIDE" <<EOF
[Service]
Environment="VPN_API_URL=http://localhost:3000"
Environment="VPN_API_TOKEN=$TOKEN_FROM_ENV"
Environment="NODE_ENV=production"
EOF
            echo "✓ override.conf actualizado con token de .env"
        else
            echo "⚠ override.conf no existe, creándolo..."
            mkdir -p "$(dirname "$SYSTEMD_OVERRIDE")"
            cat > "$SYSTEMD_OVERRIDE" <<EOF
[Service]
Environment="VPN_API_URL=http://localhost:3000"
Environment="VPN_API_TOKEN=$TOKEN_FROM_ENV"
Environment="NODE_ENV=production"
EOF
            echo "✓ override.conf creado"
        fi
    else
        echo "⚠ Token vacío en .env"
    fi
else
    echo "⚠ VPN_API_TOKEN no encontrado en .env"
fi
echo ""

# 6. Verificar sintaxis de OpenVPN
echo "6. Verificando sintaxis de OpenVPN..."
echo "-------------------------------------"
if openvpn --config "$SERVER_CONF" --verb 0 --dev null --test-crypto 2>&1 | grep -q "Configuration errors"; then
    echo "✗ Error: Hay errores en la configuración de OpenVPN"
    openvpn --config "$SERVER_CONF" --verb 0 --dev null --test-crypto
    echo ""
    echo "Restaurando backup..."
    cp "$BACKUP_FILE" "$SERVER_CONF"
    exit 1
fi
echo "✓ Sintaxis correcta"
echo ""

# 7. Recargar systemd y reiniciar OpenVPN
echo "7. Reiniciando OpenVPN..."
echo "-------------------------"
systemctl daemon-reload
systemctl restart openvpn@server

sleep 2

if systemctl is-active --quiet openvpn@server; then
    echo "✓ OpenVPN reiniciado correctamente"
else
    echo "✗ Error: OpenVPN no está corriendo"
    echo "Revisando logs:"
    journalctl -u openvpn@server --no-pager -n 10
    exit 1
fi
echo ""

echo "=========================================="
echo "HOOKS HABILITADOS"
echo "=========================================="
echo ""
echo "Próximos pasos:"
echo "  1. Desconéctate de la VPN si estás conectado"
echo "  2. Vuelve a conectarte a la VPN"
echo "  3. Verifica los logs: sudo journalctl -u openvpn@server -f"
echo "  4. Deberías ver: '[VPN Register] Conexión registrada: ...'"
echo "  5. Prueba acceder a: https://visitantes.cyberpol.com.py/api/debug-ip"
echo "  6. Debería mostrar: isVpnConnected: true"
echo ""


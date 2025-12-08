#!/bin/bash

# Script para configurar ambos hooks (client-connect y client-disconnect) de OpenVPN
# Ejecutar como root: sudo bash scripts/vpn/configurar-hooks-completos.sh

set -e

PROJECT_DIR="/home/cyberpol/web/visitantes.cyberpol.com.py/public_html"
SCRIPT_CONNECT_TS="$PROJECT_DIR/scripts/vpn/register-connection.ts"
SCRIPT_CONNECT_JS="$PROJECT_DIR/scripts/vpn/register-connection.js"
SCRIPT_DISCONNECT_TS="$PROJECT_DIR/scripts/vpn/register-disconnect.ts"
SCRIPT_DISCONNECT_JS="$PROJECT_DIR/scripts/vpn/register-disconnect.js"
SERVER_CONF="/etc/openvpn/server.conf"
OVERRIDE_DIR="/etc/systemd/system/openvpn@server.service.d"
OVERRIDE_CONF="$OVERRIDE_DIR/override.conf"

echo "=========================================="
echo "CONFIGURACIÓN COMPLETA DE HOOKS OPENVPN"
echo "=========================================="
echo ""

# Verificar que los scripts existen
if [ ! -f "$SCRIPT_CONNECT_TS" ]; then
    echo "Error: No se encontró $SCRIPT_CONNECT_TS"
    exit 1
fi

if [ ! -f "$SCRIPT_DISCONNECT_TS" ]; then
    echo "Error: No se encontró $SCRIPT_DISCONNECT_TS"
    exit 1
fi

# Compilar scripts TypeScript a JavaScript
echo "1. Compilando scripts..."
cd "$PROJECT_DIR"

if ! command -v tsc &> /dev/null; then
    echo "Instalando TypeScript..."
    npm install -g typescript
fi

# Compilar script de conexión
echo "  - Compilando register-connection.ts..."
npx tsc "$SCRIPT_CONNECT_TS" --outDir "$(dirname "$SCRIPT_CONNECT_JS")" --module commonjs --target es2020 --esModuleInterop --skipLibCheck
chmod +x "$SCRIPT_CONNECT_JS"

# Compilar script de desconexión
echo "  - Compilando register-disconnect.ts..."
npx tsc "$SCRIPT_DISCONNECT_TS" --outDir "$(dirname "$SCRIPT_DISCONNECT_JS")" --module commonjs --target es2020 --esModuleInterop --skipLibCheck
chmod +x "$SCRIPT_DISCONNECT_JS"

echo "✓ Scripts compilados"
echo ""

# Verificar que server.conf existe
if [ ! -f "$SERVER_CONF" ]; then
    echo "Error: No se encontró $SERVER_CONF"
    exit 1
fi

# Hacer backup de la configuración
BACKUP_FILE="${SERVER_CONF}.backup.$(date +%Y%m%d_%H%M%S)"
cp "$SERVER_CONF" "$BACKUP_FILE"
echo "2. Backup creado: $BACKUP_FILE"
echo ""

# Configurar client-connect
echo "3. Configurando hook client-connect..."
if grep -q "^client-connect" "$SERVER_CONF"; then
    echo "  ⚠ El hook client-connect ya está configurado"
    read -p "  ¿Deseas actualizarlo? (s/n): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Ss]$ ]]; then
        sed -i 's|^client-connect.*|#client-connect (comentado para actualizar)|' "$SERVER_CONF"
    else
        echo "  Manteniendo configuración actual"
    fi
fi

# Si no está configurado o se actualizó, agregarlo
if ! grep -q "^client-connect" "$SERVER_CONF" || grep -q "#client-connect" "$SERVER_CONF"; then
    # Eliminar líneas comentadas antiguas
    sed -i '/^#client-connect/d' "$SERVER_CONF"
    echo "" >> "$SERVER_CONF"
    echo "# Hook para registrar conexiones VPN en la base de datos" >> "$SERVER_CONF"
    echo "client-connect \"/usr/bin/node $SCRIPT_CONNECT_JS\"" >> "$SERVER_CONF"
    echo "  ✓ Hook client-connect agregado"
else
    echo "  ✓ Hook client-connect ya configurado"
fi
echo ""

# Configurar client-disconnect
echo "4. Configurando hook client-disconnect..."
if grep -q "^client-disconnect" "$SERVER_CONF"; then
    echo "  ⚠ El hook client-disconnect ya está configurado"
    read -p "  ¿Deseas actualizarlo? (s/n): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Ss]$ ]]; then
        sed -i 's|^client-disconnect.*|#client-disconnect (comentado para actualizar)|' "$SERVER_CONF"
    else
        echo "  Manteniendo configuración actual"
    fi
fi

# Si no está configurado o se actualizó, agregarlo
if ! grep -q "^client-disconnect" "$SERVER_CONF" || grep -q "#client-disconnect" "$SERVER_CONF"; then
    # Eliminar líneas comentadas antiguas
    sed -i '/^#client-disconnect/d' "$SERVER_CONF"
    echo "" >> "$SERVER_CONF"
    echo "# Hook para registrar desconexiones VPN en la base de datos" >> "$SERVER_CONF"
    echo "client-disconnect \"/usr/bin/node $SCRIPT_DISCONNECT_JS\"" >> "$SERVER_CONF"
    echo "  ✓ Hook client-disconnect agregado"
else
    echo "  ✓ Hook client-disconnect ya configurado"
fi
echo ""

# Configurar variables de entorno
echo "5. Configurando variables de entorno..."
mkdir -p "$OVERRIDE_DIR"

# Cargar variables del .env
ENV_FILE="$PROJECT_DIR/.env"
if [ -f "$ENV_FILE" ]; then
    VPN_API_URL=$(grep "^VPN_API_URL=" "$ENV_FILE" | cut -d'=' -f2 | tr -d '"' | tr -d "'" | xargs || echo "http://localhost:3000")
    VPN_API_TOKEN=$(grep "^VPN_API_TOKEN=" "$ENV_FILE" | cut -d'=' -f2 | tr -d '"' | tr -d "'" | xargs || echo "")
    NODE_ENV=$(grep "^NODE_ENV=" "$ENV_FILE" | cut -d'=' -f2 | tr -d '"' | tr -d "'" | xargs || echo "production")
else
    echo "  ⚠ No se encontró .env, usando valores por defecto"
    VPN_API_URL="http://localhost:3000"
    VPN_API_TOKEN=""
    NODE_ENV="production"
fi

# Crear o actualizar override.conf
cat > "$OVERRIDE_CONF" << EOF
[Service]
Environment="VPN_API_URL=$VPN_API_URL"
Environment="VPN_API_TOKEN=$VPN_API_TOKEN"
Environment="NODE_ENV=$NODE_ENV"
EOF

echo "  ✓ Variables de entorno configuradas en $OVERRIDE_CONF"
echo ""

# Verificar sintaxis de OpenVPN
echo "6. Verificando sintaxis de OpenVPN..."
if openvpn --config "$SERVER_CONF" --verb 0 --dev null --test-crypto 2>&1 | grep -q "Configuration errors"; then
    echo "  ✗ Error: Hay errores en la configuración"
    openvpn --config "$SERVER_CONF" --verb 0 --dev null --test-crypto
    echo ""
    echo "  Puedes restaurar el backup:"
    echo "    sudo cp $BACKUP_FILE $SERVER_CONF"
    exit 1
fi
echo "  ✓ Sintaxis correcta"
echo ""

# Recargar systemd
echo "7. Recargando configuración de systemd..."
systemctl daemon-reload
echo "  ✓ Systemd recargado"
echo ""

echo "=========================================="
echo "CONFIGURACIÓN COMPLETADA"
echo "=========================================="
echo ""
echo "Hooks configurados:"
echo "  client-connect: \"/usr/bin/node $SCRIPT_CONNECT_JS\""
echo "  client-disconnect: \"/usr/bin/node $SCRIPT_DISCONNECT_JS\""
echo ""
echo "Variables de entorno:"
echo "  VPN_API_URL=$VPN_API_URL"
echo "  VPN_API_TOKEN=${VPN_API_TOKEN:0:10}..."
echo "  NODE_ENV=$NODE_ENV"
echo ""
echo "Para aplicar los cambios:"
echo "  sudo systemctl restart openvpn@server"
echo ""
echo "Para verificar que funciona:"
echo "  1. Conéctate a la VPN"
echo "  2. Verifica en /api/debug-ip que isVpnConnected=true"
echo "  3. Desconéctate de la VPN"
echo "  4. Verifica en /api/debug-ip que isVpnConnected=false"
echo "  5. Ver logs: sudo journalctl -u openvpn@server -f"
echo ""


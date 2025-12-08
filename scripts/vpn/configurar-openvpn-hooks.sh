#!/bin/bash

# Script para configurar los hooks de OpenVPN para registrar conexiones
# Ejecutar como root: sudo bash scripts/vpn/configurar-openvpn-hooks.sh

set -e

OPENVPN_DIR="/etc/openvpn"
SERVER_CONF="$OPENVPN_DIR/server.conf"
PROJECT_DIR="/home/cyberpol/web/visitantes.cyberpol.com.py/public_html"
SCRIPT_PATH="$PROJECT_DIR/scripts/vpn/register-connection.ts"

echo "Configurando hooks de OpenVPN..."
echo ""

# Verificar que el script existe
if [ ! -f "$SCRIPT_PATH" ]; then
    echo "Error: No se encontró el script en $SCRIPT_PATH"
    exit 1
fi

# Verificar que OpenVPN está instalado
if [ ! -f "$SERVER_CONF" ]; then
    echo "Error: No se encontró la configuración de OpenVPN en $SERVER_CONF"
    exit 1
fi

# Verificar que Node.js está instalado
if ! command -v node &> /dev/null; then
    echo "Error: Node.js no está instalado"
    echo "Instala Node.js: sudo apt install nodejs npm"
    exit 1
fi

# Verificar que ts-node está instalado (o compilar el script)
if ! command -v ts-node &> /dev/null; then
    echo "Advertencia: ts-node no está instalado"
    echo "Instalando ts-node globalmente..."
    npm install -g ts-node typescript
fi

# Verificar variables de entorno
if [ -z "$VPN_API_TOKEN" ]; then
    echo "Advertencia: VPN_API_TOKEN no está configurado en el entorno"
    echo "Asegúrate de configurarlo en el servicio de OpenVPN"
fi

# Hacer backup de la configuración
if [ -f "$SERVER_CONF" ]; then
    cp "$SERVER_CONF" "${SERVER_CONF}.backup.$(date +%Y%m%d_%H%M%S)"
    echo "Backup creado: ${SERVER_CONF}.backup.*"
fi

# Verificar si ya está configurado
if grep -q "client-connect" "$SERVER_CONF"; then
    echo "Ya existe una configuración client-connect en $SERVER_CONF"
    echo "¿Deseas actualizarla? (s/n)"
    read -r response
    if [ "$response" != "s" ] && [ "$response" != "S" ]; then
        echo "Cancelado"
        exit 0
    fi
    # Eliminar línea antigua
    sed -i '/client-connect/d' "$SERVER_CONF"
fi

# Agregar configuración client-connect
echo "" >> "$SERVER_CONF"
echo "# Hook para registrar conexiones VPN en la base de datos" >> "$SERVER_CONF"
echo "client-connect \"/usr/bin/node -r ts-node/register $SCRIPT_PATH\"" >> "$SERVER_CONF"

echo ""
echo "Configuración agregada a $SERVER_CONF:"
echo "  client-connect \"/usr/bin/node -r ts-node/register $SCRIPT_PATH\""
echo ""

# Verificar sintaxis
echo "Verificando sintaxis de OpenVPN..."
if openvpn --config "$SERVER_CONF" --verb 0 --dev null --test-crypto 2>&1 | grep -q "Configuration errors"; then
    echo "Error: Hay errores en la configuración de OpenVPN"
    openvpn --config "$SERVER_CONF" --verb 0 --dev null --test-crypto
    exit 1
fi

echo "✓ Configuración válida"
echo ""

# Configurar variables de entorno para el servicio de OpenVPN
SYSTEMD_OVERRIDE="/etc/systemd/system/openvpn@server.service.d/override.conf"
mkdir -p "$(dirname "$SYSTEMD_OVERRIDE")"

if [ ! -f "$SYSTEMD_OVERRIDE" ]; then
    echo "Creando override para el servicio de OpenVPN..."
    cat > "$SYSTEMD_OVERRIDE" <<EOF
[Service]
Environment="VPN_API_URL=http://localhost:3000"
Environment="VPN_API_TOKEN=\${VPN_API_TOKEN:-}"
Environment="NODE_ENV=production"
EOF
    echo "Archivo creado: $SYSTEMD_OVERRIDE"
    echo "IMPORTANTE: Edita este archivo y agrega tu VPN_API_TOKEN"
else
    echo "El archivo $SYSTEMD_OVERRIDE ya existe"
    echo "Verifica que tenga las variables VPN_API_URL y VPN_API_TOKEN"
fi

echo ""
echo "=========================================="
echo "Configuración completada"
echo "=========================================="
echo ""
echo "Próximos pasos:"
echo "1. Edita $SYSTEMD_OVERRIDE y agrega VPN_API_TOKEN"
echo "2. Recarga systemd: sudo systemctl daemon-reload"
echo "3. Reinicia OpenVPN: sudo systemctl restart openvpn@server"
echo "4. Verifica logs: sudo journalctl -u openvpn@server -f"
echo ""


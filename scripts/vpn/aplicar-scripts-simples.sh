#!/bin/bash

# Script para aplicar los scripts simples y reiniciar OpenVPN
# Ejecutar como root: sudo bash scripts/vpn/aplicar-scripts-simples.sh

set -e

PROJECT_DIR="/home/cyberpol/web/visitantes.cyberpol.com.py/public_html"
SERVER_CONF="/etc/openvpn/server.conf"
SCRIPT_CONNECT="$PROJECT_DIR/scripts/vpn/register-connection-simple.js"
SCRIPT_DISCONNECT="$PROJECT_DIR/scripts/vpn/register-disconnect-simple.js"

echo "=========================================="
echo "APLICAR SCRIPTS SIMPLES"
echo "=========================================="
echo ""

# 1. Verificar que los scripts existen
echo "1. Verificando scripts..."
echo "-------------------------"
if [ ! -f "$SCRIPT_CONNECT" ]; then
    echo "✗ Error: $SCRIPT_CONNECT no existe"
    exit 1
fi

if [ ! -f "$SCRIPT_DISCONNECT" ]; then
    echo "✗ Error: $SCRIPT_DISCONNECT no existe"
    exit 1
fi

chmod +x "$SCRIPT_CONNECT"
chmod +x "$SCRIPT_DISCONNECT"
echo "✓ Scripts listos"
echo ""

# 2. Verificar sintaxis de los scripts
echo "2. Verificando sintaxis..."
echo "--------------------------"
if node --check "$SCRIPT_CONNECT" 2>&1; then
    echo "✓ register-connection-simple.js: sintaxis correcta"
else
    echo "✗ Error de sintaxis en register-connection-simple.js"
    exit 1
fi

if node --check "$SCRIPT_DISCONNECT" 2>&1; then
    echo "✓ register-disconnect-simple.js: sintaxis correcta"
else
    echo "✗ Error de sintaxis en register-disconnect-simple.js"
    exit 1
fi
echo ""

# 3. Verificar hooks en server.conf
echo "3. Verificando hooks en server.conf..."
echo "--------------------------------------"
if grep -q "^client-connect.*register-connection-simple" "$SERVER_CONF"; then
    echo "✓ Hooks ya están configurados con scripts simples"
else
    echo "⚠ Hooks no están configurados con scripts simples"
    echo "  Ejecuta: sudo bash scripts/vpn/cambiar-hook-a-simple.sh"
fi
echo ""

# 4. Reiniciar OpenVPN
echo "4. Reiniciando OpenVPN..."
echo "-------------------------"
systemctl daemon-reload
systemctl restart openvpn@server

sleep 2

if systemctl is-active --quiet openvpn@server; then
    echo "✓ OpenVPN reiniciado"
else
    echo "✗ Error: OpenVPN no está corriendo"
    journalctl -u openvpn@server --no-pager -n 10
    exit 1
fi
echo ""

echo "=========================================="
echo "SCRIPTS APLICADOS"
echo "=========================================="
echo ""
echo "Ahora prueba conectarte desde Windows."
echo "Monitorea los logs: sudo journalctl -u openvpn@server -f"
echo ""


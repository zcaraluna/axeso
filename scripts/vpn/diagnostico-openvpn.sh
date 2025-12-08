#!/bin/bash

# Script para diagnosticar problemas de OpenVPN
# Ejecutar como root: sudo bash scripts/vpn/diagnostico-openvpn.sh

echo "=========================================="
echo "DIAGNÓSTICO DE OPENVPN"
echo "=========================================="
echo ""

OPENVPN_DIR="/etc/openvpn"
SERVER_CONF="$OPENVPN_DIR/server.conf"

echo "1. Verificando estado del servicio..."
echo "--------------------------------------"
systemctl status openvpn@server --no-pager -l | head -20
echo ""

echo "2. Verificando errores recientes..."
echo "------------------------------------"
journalctl -u openvpn@server -n 30 --no-pager | tail -20
echo ""

echo "3. Verificando configuración client-connect..."
echo "----------------------------------------------"
grep -E "^#?client-connect" "$SERVER_CONF" || echo "  No se encontró client-connect"
echo ""

echo "4. Verificando sintaxis de OpenVPN..."
echo "--------------------------------------"
if openvpn --config "$SERVER_CONF" --verb 0 --dev null --test-crypto 2>&1 | head -10; then
    echo "✓ Sintaxis correcta"
else
    echo "✗ Error en sintaxis"
fi
echo ""

echo "5. Verificando que el script existe..."
echo "--------------------------------------"
SCRIPT_JS="/home/cyberpol/web/visitantes.cyberpol.com.py/public_html/scripts/vpn/register-connection.js"
if [ -f "$SCRIPT_JS" ]; then
    echo "✓ Script encontrado: $SCRIPT_JS"
    ls -la "$SCRIPT_JS"
    echo ""
    echo "Probando ejecución del script..."
    if node "$SCRIPT_JS" 2>&1 | head -5; then
        echo "✓ Script se puede ejecutar"
    else
        echo "✗ Error al ejecutar el script"
    fi
else
    echo "✗ Script NO encontrado: $SCRIPT_JS"
fi
echo ""

echo "6. Verificando permisos..."
echo "---------------------------"
ls -la "$SCRIPT_JS" 2>/dev/null || echo "  Script no existe"
echo ""

echo "=========================================="
echo "DIAGNÓSTICO COMPLETADO"
echo "=========================================="


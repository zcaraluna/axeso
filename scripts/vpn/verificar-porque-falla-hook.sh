#!/bin/bash

# Script para verificar por qué el hook está fallando
# Ejecutar como root: sudo bash scripts/vpn/verificar-porque-falla-hook.sh

echo "=========================================="
echo "VERIFICACIÓN DE POR QUÉ FALLA EL HOOK"
echo "=========================================="
echo ""

PROJECT_DIR="/home/cyberpol/web/visitantes.cyberpol.com.py/public_html"
SERVER_CONF="/etc/openvpn/server.conf"
SCRIPT_JS="$PROJECT_DIR/scripts/vpn/register-connection-simple.js"

echo "1. Verificar hooks en server.conf:"
echo "----------------------------------"
grep -E "^client-connect|^client-disconnect" "$SERVER_CONF" | sed 's/^/  /' || echo "  ✗ No se encontraron hooks"
echo ""

echo "2. Verificar que el script existe y tiene permisos:"
echo "---------------------------------------------------"
if [ -f "$SCRIPT_JS" ]; then
    ls -la "$SCRIPT_JS" | awk '{print "  " $0}'
    echo ""
    echo "  Probando ejecutar con variables de entorno simuladas:"
    export common_name="TEST"
    export ifconfig_pool_remote_ip="10.8.0.99"
    export trusted_ip="181.91.85.248"
    export VPN_API_URL="http://localhost:3000"
    export VPN_API_TOKEN=$(grep "^VPN_API_TOKEN=" "$PROJECT_DIR/.env" | cut -d'=' -f2 | tr -d '"' | tr -d "'" | tr -d ' ' | head -1)
    
    echo "  Ejecutando script..."
    timeout 2 node "$SCRIPT_JS" 2>&1 | head -5 | sed 's/^/    /' || echo "    (error o timeout)"
    echo "  Código de salida: ${PIPESTATUS[0]}"
else
    echo "  ✗ Script no existe: $SCRIPT_JS"
fi
echo ""

echo "3. Verificar logs de OpenVPN (últimos intentos de conexión):"
echo "-----------------------------------------------------------"
echo "Buscando mensajes relacionados con hooks o errores:"
journalctl -u openvpn@server --no-pager -n 100 | grep -iE "client-connect|register|hook|error|failed|script" | tail -20 | sed 's/^/  /' || echo "  (no se encontraron mensajes)"
echo ""

echo "4. Verificar si hay procesos node ejecutándose cuando se intenta conectar:"
echo "-------------------------------------------------------------------------"
echo "  (Ejecuta esto mientras intentas conectar desde Windows)"
echo "  ps aux | grep -E 'node.*register' | grep -v grep"
echo ""

echo "5. Verificar permisos del directorio y archivos:"
echo "-----------------------------------------------"
ls -la "$PROJECT_DIR/scripts/vpn/" | grep -E "register|\.js" | sed 's/^/  /'
echo ""

echo "6. Probar ejecutar el script directamente con node:"
echo "---------------------------------------------------"
if [ -f "$SCRIPT_JS" ]; then
    echo "  Simulando ejecución desde OpenVPN:"
    export common_name="ADMIN-GARV1"
    export ifconfig_pool_remote_ip="10.8.0.6"
    export trusted_ip="181.91.85.248"
    export VPN_API_URL="http://localhost:3000"
    export VPN_API_TOKEN=$(grep "^VPN_API_TOKEN=" "$PROJECT_DIR/.env" | cut -d'=' -f2 | tr -d '"' | tr -d "'" | tr -d ' ' | head -1)
    
    echo "  Ejecutando: node $SCRIPT_JS"
    time node "$SCRIPT_JS" 2>&1
    echo "  Código de salida: $?"
else
    echo "  ✗ Script no existe"
fi
echo ""

echo "=========================================="
echo "VERIFICACIÓN COMPLETADA"
echo "=========================================="
echo ""
echo "Si el script funciona manualmente pero falla desde OpenVPN:"
echo "  1. Verifica que las variables de entorno estén en override.conf"
echo "  2. Verifica que el path del script sea correcto"
echo "  3. Verifica permisos del script"
echo ""


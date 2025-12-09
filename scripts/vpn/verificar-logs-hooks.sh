#!/bin/bash

# Script para verificar logs de hooks de OpenVPN
# Ejecutar como root: sudo bash scripts/vpn/verificar-logs-hooks.sh

echo "=========================================="
echo "VERIFICACIÓN DE LOGS DE HOOKS"
echo "=========================================="
echo ""

echo "1. Logs recientes de OpenVPN (últimas 50 líneas):"
echo "--------------------------------------------------"
journalctl -u openvpn@server --no-pager -n 50 | tail -50
echo ""

echo "2. Buscar errores relacionados con hooks:"
echo "-----------------------------------------"
journalctl -u openvpn@server --no-pager | grep -iE "client-connect|register|hook|error|failed" | tail -20 | sed 's/^/  /' || echo "  (no se encontraron errores)"
echo ""

echo "3. Verificar si el script se está ejecutando:"
echo "---------------------------------------------"
# Buscar procesos node relacionados con register-connection
ps aux | grep -E "register-connection|register-disconnect" | grep -v grep | sed 's/^/  /' || echo "  (no hay procesos ejecutándose)"
echo ""

echo "4. Verificar permisos y existencia del script:"
echo "-----------------------------------------------"
SCRIPT_JS="/home/cyberpol/web/visitantes.cyberpol.com.py/public_html/scripts/vpn/register-connection.js"
if [ -f "$SCRIPT_JS" ]; then
    echo "  Archivo existe: $SCRIPT_JS"
    ls -la "$SCRIPT_JS" | awk '{print "    " $0}'
    
    echo ""
    echo "  Probando ejecutar manualmente (solo verificar que Node puede leerlo):"
    if node --check "$SCRIPT_JS" 2>&1; then
        echo "    ✓ Node.js puede leer el archivo"
    else
        echo "    ✗ Error al leer el archivo"
    fi
else
    echo "  ✗ Archivo NO existe: $SCRIPT_JS"
fi
echo ""

echo "5. Verificar variables de entorno en el proceso de OpenVPN:"
echo "------------------------------------------------------------"
# Obtener PID de OpenVPN
OVPN_PID=$(pgrep -f "openvpn.*server.conf" | head -1)
if [ -n "$OVPN_PID" ]; then
    echo "  PID de OpenVPN: $OVPN_PID"
    echo "  Variables de entorno:"
    sudo cat /proc/$OVPN_PID/environ 2>/dev/null | tr '\0' '\n' | grep -E "VPN_|NODE" | sed 's/^/    /' || echo "    (no se pudieron leer)"
else
    echo "  ⚠ OpenVPN no está corriendo o no se pudo encontrar el PID"
fi
echo ""

echo "6. Verificar configuración de hooks en server.conf:"
echo "---------------------------------------------------"
SERVER_CONF="/etc/openvpn/server.conf"
if [ -f "$SERVER_CONF" ]; then
    echo "  Hooks configurados:"
    grep -E "^client-connect|^client-disconnect" "$SERVER_CONF" | sed 's/^/    /' || echo "    (no se encontraron hooks activos)"
    
    echo ""
    echo "  Hooks comentados:"
    grep -E "^#client-connect|^#client-disconnect" "$SERVER_CONF" | sed 's/^/    /' || echo "    (ninguno comentado)"
fi
echo ""

echo "=========================================="
echo "VERIFICACIÓN COMPLETADA"
echo "=========================================="
echo ""
echo "Si ves errores en los logs, el hook está fallando."
echo "Si no ves ningún mensaje del hook, el hook no se está ejecutando."
echo ""


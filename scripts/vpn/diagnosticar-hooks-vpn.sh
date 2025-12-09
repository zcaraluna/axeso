#!/bin/bash

# Script para diagnosticar por qué los hooks de OpenVPN no están funcionando
# Ejecutar como root: sudo bash scripts/vpn/diagnosticar-hooks-vpn.sh

echo "=========================================="
echo "DIAGNÓSTICO DE HOOKS VPN"
echo "=========================================="
echo ""

PROJECT_DIR="/home/cyberpol/web/visitantes.cyberpol.com.py/public_html"
SERVER_CONF="/etc/openvpn/server.conf"
REGISTER_CONNECT_TS="$PROJECT_DIR/scripts/vpn/register-connection.ts"
REGISTER_CONNECT_JS="$PROJECT_DIR/scripts/vpn/register-connection.js"
REGISTER_DISCONNECT_TS="$PROJECT_DIR/scripts/vpn/register-disconnect.ts"
REGISTER_DISCONNECT_JS="$PROJECT_DIR/scripts/vpn/register-disconnect.js"
SYSTEMD_OVERRIDE="/etc/systemd/system/openvpn@server.service.d/override.conf"

echo "1. Verificar que OpenVPN está corriendo:"
echo "----------------------------------------"
if systemctl is-active --quiet openvpn@server; then
    echo "✓ OpenVPN está corriendo"
    systemctl status openvpn@server --no-pager | head -5
else
    echo "✗ OpenVPN NO está corriendo"
    echo "  Inicia con: sudo systemctl start openvpn@server"
fi
echo ""

echo "2. Verificar hooks en server.conf:"
echo "----------------------------------"
if [ -f "$SERVER_CONF" ]; then
    echo "Hooks configurados:"
    grep -E "^client-connect|^client-disconnect" "$SERVER_CONF" || echo "  ✗ No se encontraron hooks configurados"
    
    echo ""
    echo "Hooks comentados:"
    grep -E "^#client-connect|^#client-disconnect" "$SERVER_CONF" || echo "  (ninguno comentado)"
else
    echo "✗ $SERVER_CONF no existe"
fi
echo ""

echo "3. Verificar que los scripts existen:"
echo "-------------------------------------"
if [ -f "$REGISTER_CONNECT_TS" ]; then
    echo "✓ register-connection.ts existe"
else
    echo "✗ register-connection.ts NO existe: $REGISTER_CONNECT_TS"
fi

if [ -f "$REGISTER_CONNECT_JS" ]; then
    echo "✓ register-connection.js existe (compilado)"
else
    echo "✗ register-connection.js NO existe (necesita compilarse)"
    echo "  Compilar con: npx tsc $REGISTER_CONNECT_TS --outDir $(dirname $REGISTER_CONNECT_JS) --module commonjs --target es2020 --esModuleInterop --skipLibCheck"
fi

if [ -f "$REGISTER_DISCONNECT_TS" ]; then
    echo "✓ register-disconnect.ts existe"
else
    echo "✗ register-disconnect.ts NO existe: $REGISTER_DISCONNECT_TS"
fi

if [ -f "$REGISTER_DISCONNECT_JS" ]; then
    echo "✓ register-disconnect.js existe (compilado)"
else
    echo "✗ register-disconnect.js NO existe (necesita compilarse)"
fi
echo ""

echo "4. Verificar permisos de los scripts:"
echo "------------------------------------"
if [ -f "$REGISTER_CONNECT_JS" ]; then
    ls -la "$REGISTER_CONNECT_JS" | awk '{print "  " $0}'
fi
if [ -f "$REGISTER_DISCONNECT_JS" ]; then
    ls -la "$REGISTER_DISCONNECT_JS" | awk '{print "  " $0}'
fi
echo ""

echo "5. Verificar variables de entorno en systemd:"
echo "--------------------------------------------"
if [ -f "$SYSTEMD_OVERRIDE" ]; then
    echo "✓ Archivo override existe: $SYSTEMD_OVERRIDE"
    echo "Contenido:"
    cat "$SYSTEMD_OVERRIDE" | sed 's/^/  /'
    
    # Verificar que las variables estén configuradas
    if grep -q "VPN_API_URL" "$SYSTEMD_OVERRIDE"; then
        echo "  ✓ VPN_API_URL configurado"
    else
        echo "  ✗ VPN_API_URL NO configurado"
    fi
    
    if grep -q "VPN_API_TOKEN" "$SYSTEMD_OVERRIDE"; then
        echo "  ✓ VPN_API_TOKEN configurado"
        TOKEN_FROM_OVERRIDE=$(grep "VPN_API_TOKEN" "$SYSTEMD_OVERRIDE" | cut -d'=' -f2 | tr -d '"' | tr -d "'" | tr -d ' ')
    else
        echo "  ✗ VPN_API_TOKEN NO configurado"
    fi
else
    echo "✗ Archivo override NO existe: $SYSTEMD_OVERRIDE"
    echo "  Crear con: sudo mkdir -p $(dirname $SYSTEMD_OVERRIDE)"
fi
echo ""

echo "6. Verificar VPN_API_TOKEN en .env:"
echo "-----------------------------------"
ENV_FILE="$PROJECT_DIR/.env"
if [ -f "$ENV_FILE" ]; then
    if grep -q "VPN_API_TOKEN" "$ENV_FILE"; then
        TOKEN_FROM_ENV=$(grep "VPN_API_TOKEN" "$ENV_FILE" | cut -d'=' -f2 | tr -d '"' | tr -d "'" | tr -d ' ' | head -1)
        if [ -n "$TOKEN_FROM_ENV" ]; then
            echo "  ✓ VPN_API_TOKEN encontrado en .env"
            echo "  Token (primeros 10 caracteres): ${TOKEN_FROM_ENV:0:10}..."
            
            # Comparar con el override si existe
            if [ -n "$TOKEN_FROM_OVERRIDE" ] && [ "$TOKEN_FROM_ENV" != "$TOKEN_FROM_OVERRIDE" ]; then
                echo "  ⚠ ADVERTENCIA: Los tokens en .env y override.conf NO coinciden"
            fi
        else
            echo "  ✗ VPN_API_TOKEN está vacío en .env"
        fi
    else
        echo "  ✗ VPN_API_TOKEN NO encontrado en .env"
    fi
else
    echo "  ✗ Archivo .env no existe: $ENV_FILE"
fi
echo ""

echo "7. Verificar que Node.js puede ejecutar los scripts:"
echo "----------------------------------------------------"
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo "  ✓ Node.js instalado: $NODE_VERSION"
    
    if [ -f "$REGISTER_CONNECT_JS" ]; then
        echo "  Probando ejecutar register-connection.js (solo sintaxis)..."
        if node --check "$REGISTER_CONNECT_JS" 2>&1; then
            echo "    ✓ Sintaxis correcta"
        else
            echo "    ✗ Error de sintaxis"
        fi
    fi
else
    echo "  ✗ Node.js NO está instalado"
fi
echo ""

echo "8. Verificar logs recientes de OpenVPN:"
echo "---------------------------------------"
echo "Últimas 20 líneas de logs de OpenVPN:"
journalctl -u openvpn@server --no-pager -n 20 | tail -20 | sed 's/^/  /'
echo ""

echo "9. Buscar errores relacionados con hooks en logs:"
echo "-------------------------------------------------"
echo "Errores de hooks:"
journalctl -u openvpn@server --no-pager | grep -iE "register|hook|client-connect|client-disconnect|error" | tail -10 | sed 's/^/  /' || echo "  (no se encontraron errores relacionados)"
echo ""

echo "10. Verificar conexiones VPN activas:"
echo "------------------------------------"
if [ -f "/var/log/openvpn-status.log" ]; then
    echo "Conexiones activas:"
    cat /var/log/openvpn-status.log | grep -A 10 "CLIENT LIST" | tail -10 | sed 's/^/  /' || echo "  (no hay conexiones activas o el archivo está vacío)"
else
    echo "  Archivo /var/log/openvpn-status.log no existe"
fi
echo ""

echo "11. Verificar conexiones en la base de datos:"
echo "---------------------------------------------"
# Intentar verificar si hay conexiones recientes
if command -v psql &> /dev/null; then
    echo "Últimas 5 conexiones registradas:"
    sudo -u postgres psql controldeacceso -c "SELECT \"certificateName\", \"ipAddress\", \"realIpAddress\", \"connectedAt\" FROM vpn_connections ORDER BY \"connectedAt\" DESC LIMIT 5;" 2>/dev/null | sed 's/^/  /' || echo "  (no se pudo consultar la base de datos)"
else
    echo "  psql no está disponible para consultar la BD"
fi
echo ""

echo "=========================================="
echo "RESUMEN Y RECOMENDACIONES"
echo "=========================================="
echo ""
echo "Si los hooks no están funcionando:"
echo "  1. Verifica que los scripts JavaScript estén compilados"
echo "  2. Verifica que las variables de entorno estén en override.conf"
echo "  3. Verifica que VPN_API_TOKEN coincida en .env y override.conf"
echo "  4. Reinicia OpenVPN después de hacer cambios:"
echo "     sudo systemctl daemon-reload"
echo "     sudo systemctl restart openvpn@server"
echo ""
echo "Para compilar los scripts:"
echo "  cd $PROJECT_DIR"
echo "  npx tsc scripts/vpn/register-connection.ts --outDir scripts/vpn --module commonjs --target es2020 --esModuleInterop --skipLibCheck"
echo "  npx tsc scripts/vpn/register-disconnect.ts --outDir scripts/vpn --module commonjs --target es2020 --esModuleInterop --skipLibCheck"
echo ""


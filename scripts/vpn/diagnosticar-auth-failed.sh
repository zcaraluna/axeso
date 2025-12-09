#!/bin/bash

# Script para diagnosticar AUTH_FAILED cuando los hooks están habilitados
# Ejecutar como root: sudo bash scripts/vpn/diagnosticar-auth-failed.sh

set -e

PROJECT_DIR="/home/cyberpol/web/visitantes.cyberpol.com.py/public_html"
SERVER_CONF="/etc/openvpn/server.conf"
OVERRIDE_CONF="/etc/systemd/system/openvpn@server.service.d/override.conf"
CONNECT_SCRIPT="$PROJECT_DIR/scripts/vpn/register-connection-simple.js"
DISCONNECT_SCRIPT="$PROJECT_DIR/scripts/vpn/register-disconnect-simple.js"

echo "=========================================="
echo "DIAGNÓSTICO: AUTH_FAILED CON HOOKS"
echo "=========================================="
echo ""

# 1. Verificar estado de OpenVPN
echo "1. Estado de OpenVPN:"
echo "---------------------"
if systemctl is-active --quiet openvpn@server; then
    echo "✓ OpenVPN está corriendo"
else
    echo "✗ OpenVPN NO está corriendo"
    exit 1
fi
echo ""

# 2. Verificar hooks en server.conf
echo "2. Verificando hooks en server.conf:"
echo "-------------------------------------"
if grep -q "^client-connect" "$SERVER_CONF"; then
    echo "✓ client-connect encontrado:"
    grep "^client-connect" "$SERVER_CONF" | sed 's/^/  /'
else
    echo "✗ client-connect NO encontrado"
fi

if grep -q "^client-disconnect" "$SERVER_CONF"; then
    echo "✓ client-disconnect encontrado:"
    grep "^client-disconnect" "$SERVER_CONF" | sed 's/^/  /'
else
    echo "✗ client-disconnect NO encontrado"
fi
echo ""

# 3. Verificar que los scripts existen y son ejecutables
echo "3. Verificando scripts de hooks:"
echo "--------------------------------"
if [ -f "$CONNECT_SCRIPT" ]; then
    echo "✓ Script de conexión existe: $CONNECT_SCRIPT"
    if [ -x "$CONNECT_SCRIPT" ]; then
        echo "  ✓ Es ejecutable"
    else
        echo "  ✗ NO es ejecutable (corrigiendo...)"
        chmod +x "$CONNECT_SCRIPT"
        echo "  ✓ Permisos corregidos"
    fi
else
    echo "✗ Script de conexión NO existe: $CONNECT_SCRIPT"
fi

if [ -f "$DISCONNECT_SCRIPT" ]; then
    echo "✓ Script de desconexión existe: $DISCONNECT_SCRIPT"
    if [ -x "$DISCONNECT_SCRIPT" ]; then
        echo "  ✓ Es ejecutable"
    else
        echo "  ✗ NO es ejecutable (corrigiendo...)"
        chmod +x "$DISCONNECT_SCRIPT"
        echo "  ✓ Permisos corregidos"
    fi
else
    echo "✗ Script de desconexión NO existe: $DISCONNECT_SCRIPT"
fi
echo ""

# 4. Verificar variables de entorno
echo "4. Verificando variables de entorno:"
echo "-------------------------------------"
if [ -f "$OVERRIDE_CONF" ]; then
    echo "✓ override.conf existe:"
    cat "$OVERRIDE_CONF" | sed 's/^/  /'
    
    # Verificar VPN_API_TOKEN
    if grep -q "VPN_API_TOKEN" "$OVERRIDE_CONF"; then
        TOKEN=$(grep "VPN_API_TOKEN" "$OVERRIDE_CONF" | cut -d'=' -f2 | tr -d '"' | tr -d "'" | xargs)
        if [ -n "$TOKEN" ]; then
            echo "  ✓ VPN_API_TOKEN configurado (${#TOKEN} caracteres)"
        else
            echo "  ✗ VPN_API_TOKEN está vacío"
        fi
    else
        echo "  ✗ VPN_API_TOKEN NO está configurado"
    fi
else
    echo "✗ override.conf NO existe"
fi
echo ""

# 5. Probar ejecutar el hook manualmente
echo "5. Probando hook manualmente:"
echo "------------------------------"
if [ -f "$CONNECT_SCRIPT" ]; then
    echo "Simulando variables de entorno..."
    export common_name="TEST-CERT"
    export ifconfig_pool_remote_ip="10.8.0.99"
    export trusted_ip="127.0.0.1"
    export VPN_API_URL="http://localhost:3000"
    
    if [ -f "$OVERRIDE_CONF" ] && grep -q "VPN_API_TOKEN" "$OVERRIDE_CONF"; then
        export VPN_API_TOKEN=$(grep "VPN_API_TOKEN" "$OVERRIDE_CONF" | cut -d'=' -f2 | tr -d '"' | tr -d "'" | xargs)
    fi
    
    echo "Ejecutando script (debe terminar en < 1 segundo)..."
    START_TIME=$(date +%s%N)
    timeout 2 node "$CONNECT_SCRIPT" 2>&1 || true
    END_TIME=$(date +%s%N)
    DURATION=$((($END_TIME - $START_TIME) / 1000000))
    
    if [ $DURATION -lt 1000 ]; then
        echo "  ✓ Script terminó rápido (${DURATION}ms)"
    else
        echo "  ⚠ Script tardó ${DURATION}ms (puede ser demasiado lento)"
    fi
else
    echo "  ✗ No se puede probar (script no existe)"
fi
echo ""

# 6. Verificar logs recientes de OpenVPN
echo "6. Últimos logs de OpenVPN (últimas 30 líneas):"
echo "-----------------------------------------------"
journalctl -u openvpn@server -n 30 --no-pager | tail -30
echo ""

# 7. Verificar si hay errores en los logs
echo "7. Buscando errores en logs:"
echo "-----------------------------"
ERRORS=$(journalctl -u openvpn@server -n 100 --no-pager | grep -i "error\|fail\|auth_failed" | tail -10 || true)
if [ -n "$ERRORS" ]; then
    echo "Errores encontrados:"
    echo "$ERRORS" | sed 's/^/  /'
else
    echo "  ✓ No se encontraron errores recientes"
fi
echo ""

# 8. Verificar que Node.js puede ejecutar el script
echo "8. Verificando Node.js:"
echo "-----------------------"
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo "✓ Node.js instalado: $NODE_VERSION"
    
    # Probar si puede ejecutar el script
    if [ -f "$CONNECT_SCRIPT" ]; then
        if node -e "require('$CONNECT_SCRIPT')" 2>&1 | grep -q "Cannot find module"; then
            echo "  ⚠ Advertencia: El script puede tener problemas de módulos"
        else
            echo "  ✓ Node.js puede cargar el script"
        fi
    fi
else
    echo "✗ Node.js NO está instalado"
fi
echo ""

echo "=========================================="
echo "DIAGNÓSTICO COMPLETADO"
echo "=========================================="
echo ""
echo "Próximos pasos:"
echo "1. Si los hooks están causando problemas, deshabilítalos temporalmente:"
echo "   sudo bash $PROJECT_DIR/scripts/vpn/deshabilitar-hooks-temporalmente.sh"
echo ""
echo "2. Luego intenta conectarte desde Windows"
echo ""
echo "3. Si funciona sin hooks, el problema está en los scripts"
echo "   Revisa los logs mientras intentas conectar:"
echo "   sudo journalctl -u openvpn@server -f"
echo ""


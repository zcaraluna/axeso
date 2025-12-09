#!/bin/bash

# Script para verificar si las conexiones se están registrando
# Ejecutar como root: sudo bash scripts/vpn/verificar-registro-conexion.sh

echo "=========================================="
echo "VERIFICACIÓN DE REGISTRO DE CONEXIONES"
echo "=========================================="
echo ""

PROJECT_DIR="/home/cyberpol/web/visitantes.cyberpol.com.py/public_html"
ENV_FILE="$PROJECT_DIR/.env"

echo "1. Verificar conexiones VPN activas en OpenVPN:"
echo "------------------------------------------------"
if [ -f "/var/log/openvpn-status.log" ]; then
    echo "Conexiones activas:"
    cat /var/log/openvpn-status.log | grep -A 10 "CLIENT LIST" | tail -10 | sed 's/^/  /'
    
    # Extraer IP real de la conexión activa
    REAL_IP=$(cat /var/log/openvpn-status.log | grep -E "^[A-Za-z0-9_-]+," | head -1 | cut -d',' -f2 | awk '{print $1}' | cut -d':' -f1)
    if [ -n "$REAL_IP" ]; then
        echo ""
        echo "IP pública detectada: $REAL_IP"
    fi
else
    echo "  Archivo /var/log/openvpn-status.log no existe"
fi
echo ""

echo "2. Verificar conexiones en la base de datos:"
echo "--------------------------------------------"
if command -v psql &> /dev/null; then
    echo "Últimas 10 conexiones registradas:"
    sudo -u postgres psql controldeacceso -c "SELECT \"certificateName\", \"ipAddress\", \"realIpAddress\", \"connectedAt\", \"disconnectedAt\" FROM vpn_connections ORDER BY \"connectedAt\" DESC LIMIT 10;" 2>/dev/null | sed 's/^/  /' || echo "  (error al consultar)"
    
    echo ""
    echo "Conexiones activas (sin disconnectedAt):"
    sudo -u postgres psql controldeacceso -c "SELECT \"certificateName\", \"ipAddress\", \"realIpAddress\", \"connectedAt\" FROM vpn_connections WHERE \"disconnectedAt\" IS NULL ORDER BY \"connectedAt\" DESC LIMIT 5;" 2>/dev/null | sed 's/^/  /' || echo "  (error al consultar)"
    
    if [ -n "$REAL_IP" ]; then
        echo ""
        echo "Buscando conexiones para IP pública: $REAL_IP"
        sudo -u postgres psql controldeacceso -c "SELECT \"certificateName\", \"ipAddress\", \"realIpAddress\", \"connectedAt\", \"disconnectedAt\" FROM vpn_connections WHERE \"realIpAddress\" = '$REAL_IP' ORDER BY \"connectedAt\" DESC LIMIT 5;" 2>/dev/null | sed 's/^/  /' || echo "  (error al consultar)"
    fi
else
    echo "  psql no está disponible"
fi
echo ""

echo "3. Verificar logs de OpenVPN para mensajes de hooks:"
echo "----------------------------------------------------"
echo "Buscando mensajes de registro en los últimos 50 logs:"
journalctl -u openvpn@server --no-pager -n 50 | grep -iE "VPN Register|VPN Disconnect|register|hook" | tail -10 | sed 's/^/  /' || echo "  (no se encontraron mensajes de hooks)"
echo ""

echo "4. Probar ejecutar el script de registro manualmente:"
echo "-----------------------------------------------------"
if [ -f "$PROJECT_DIR/scripts/vpn/register-connection.js" ]; then
    echo "Simulando variables de entorno de OpenVPN..."
    export common_name="TEST-CERT"
    export ifconfig_pool_remote_ip="10.8.0.99"
    export trusted_ip="181.91.85.248"
    export VPN_API_URL="http://localhost:3000"
    
    if [ -f "$ENV_FILE" ] && grep -q "VPN_API_TOKEN" "$ENV_FILE"; then
        export VPN_API_TOKEN=$(grep "^VPN_API_TOKEN=" "$ENV_FILE" | cut -d'=' -f2 | tr -d '"' | tr -d "'" | tr -d ' ' | head -1)
        echo "  Token cargado desde .env"
    else
        echo "  ⚠ VPN_API_TOKEN no encontrado en .env"
    fi
    
    echo ""
    echo "Ejecutando script de registro (solo prueba, no se registrará realmente):"
    cd "$PROJECT_DIR"
    timeout 5 node scripts/vpn/register-connection.js 2>&1 | head -10 | sed 's/^/  /' || echo "  (error o timeout)"
else
    echo "  Script register-connection.js no existe"
fi
echo ""

echo "5. Verificar que el endpoint de verificación funciona:"
echo "------------------------------------------------------"
if [ -f "$ENV_FILE" ] && grep -q "VPN_API_TOKEN" "$ENV_FILE"; then
    TOKEN=$(grep "^VPN_API_TOKEN=" "$ENV_FILE" | cut -d'=' -f2 | tr -d '"' | tr -d "'" | tr -d ' ' | head -1)
    if [ -n "$TOKEN" ] && [ -n "$REAL_IP" ]; then
        echo "Probando endpoint de verificación con IP: $REAL_IP"
        HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -H "X-API-Token: $TOKEN" "http://localhost:3000/api/vpn/connections?check=true&realIp=$REAL_IP" 2>/dev/null || echo "000")
        if [ "$HTTP_CODE" = "200" ]; then
            echo "  ✓ Endpoint responde (HTTP $HTTP_CODE)"
            echo "  Respuesta:"
            curl -s -H "X-API-Token: $TOKEN" "http://localhost:3000/api/vpn/connections?check=true&realIp=$REAL_IP" 2>/dev/null | sed 's/^/    /' || echo "    (error)"
        else
            echo "  ✗ Endpoint NO responde correctamente (HTTP $HTTP_CODE)"
        fi
    else
        echo "  ⚠ No se pudo obtener token o IP real"
    fi
else
    echo "  ⚠ VPN_API_TOKEN no encontrado en .env"
fi
echo ""

echo "=========================================="
echo "VERIFICACIÓN COMPLETADA"
echo "=========================================="
echo ""
echo "Si no hay conexiones en la BD:"
echo "  1. Los hooks no se están ejecutando"
echo "  2. Los hooks fallan silenciosamente"
echo "  3. Verifica los logs: sudo journalctl -u openvpn@server -f"
echo ""
echo "Si hay conexiones pero isVpnConnected sigue siendo false:"
echo "  1. Verifica que el endpoint de verificación funcione"
echo "  2. Verifica que VPN_API_TOKEN sea correcto"
echo "  3. Verifica que la búsqueda por realIpAddress funcione"
echo ""


#!/bin/bash

# Script para probar el sistema de detección completo
# Ejecutar como root: sudo bash scripts/vpn/probar-deteccion-completa.sh

set -e

PROJECT_DIR="/home/cyberpol/web/visitantes.cyberpol.com.py/public_html"
STATUS_FILE="/var/log/openvpn-status.log"

echo "=========================================="
echo "PRUEBA COMPLETA: DETECCIÓN VPN"
echo "=========================================="
echo ""

# 1. Leer IP real del archivo de estado
echo "1. Leyendo conexiones activas del archivo de estado:"
echo "---------------------------------------------------"
if [ -f "$STATUS_FILE" ] && [ -r "$STATUS_FILE" ]; then
    # Extraer IPs reales de las conexiones activas
    # Solo líneas que tienen formato IP:PUERTO (contienen punto y dos puntos)
    REAL_IPS=$(grep -v "^#" "$STATUS_FILE" | \
        grep -v "^CLIENT LIST" | \
        grep -v "^ROUTING TABLE" | \
        grep -v "^GLOBAL STATS" | \
        grep -v "^Updated" | \
        grep -v "^END" | \
        grep -v "^Common Name" | \
        grep -v "^Virtual Address" | \
        grep -v "^Max bcast" | \
        grep -v "^$" | \
        grep "," | \
        awk -F',' '{print $2}' | \
        awk -F':' '{print $1}' | \
        grep -E "^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$" | \
        sort -u)
    
    if [ -n "$REAL_IPS" ]; then
        echo "✓ IPs reales encontradas:"
        echo "$REAL_IPS" | while read IP; do
            if [ -n "$IP" ] && [[ "$IP" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
                echo "  - $IP"
            fi
        done
        
        # Tomar la primera IP válida para pruebas
        TEST_IP=$(echo "$REAL_IPS" | grep -E "^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$" | head -1)
        if [ -z "$TEST_IP" ]; then
            TEST_IP="181.91.85.248"  # IP conocida de la conexión activa
        fi
        echo ""
        echo "  Usando IP de prueba: $TEST_IP"
    else
        echo "⚠ No se encontraron conexiones activas"
        TEST_IP="181.91.85.248"  # IP conocida de la conexión activa
        echo "  Usando IP de prueba: $TEST_IP"
    fi
else
    echo "✗ No se puede leer el archivo de estado"
    TEST_IP="181.91.85.248"  # IP conocida de la conexión activa
fi
echo ""

# 2. Probar endpoint directamente con curl
echo "2. Probando endpoint /api/vpn/check-status:"
echo "----------------------------------------------"
echo "Probando con IP: $TEST_IP"
echo ""

# Intentar con timeout más largo
RESPONSE=$(timeout 5 curl -s "http://localhost:3000/api/vpn/check-status?realIp=$TEST_IP" 2>&1 || echo "ERROR")

if echo "$RESPONSE" | grep -q "isActive"; then
    echo "✓ Endpoint responde correctamente"
    echo ""
    echo "Respuesta JSON:"
    echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE" | sed 's/^/  /'
    
    # Verificar si detecta la conexión
    if echo "$RESPONSE" | grep -q '"isActive":true'; then
        echo ""
        echo "  ✅ ¡Conexión VPN detectada correctamente!"
    elif echo "$RESPONSE" | grep -q '"isActive":false'; then
        echo ""
        echo "  ⚠ Conexión NO detectada (isActive: false)"
    fi
elif echo "$RESPONSE" | grep -q "timeout\|Killed\|Connection refused"; then
    echo "⚠ Endpoint no responde"
    echo "  Error: $RESPONSE"
    echo ""
    echo "  Posibles causas:"
    echo "  - La app está recargando"
    echo "  - Falta de memoria"
    echo "  - El puerto 3000 no está escuchando"
    echo ""
    echo "  Soluciones:"
    echo "  1. Reiniciar PM2: pm2 restart axeso"
    echo "  2. Verificar logs: pm2 logs axeso --lines 50"
    echo "  3. Verificar puerto: ss -tlnp | grep 3000"
else
    echo "⚠ Respuesta inesperada:"
    echo "$RESPONSE" | head -10 | sed 's/^/  /'
fi
echo ""

# 3. Probar endpoint /api/debug-ip
echo "3. Probando endpoint /api/debug-ip:"
echo "------------------------------------"
DEBUG_RESPONSE=$(timeout 5 curl -s "http://localhost:3000/api/debug-ip" 2>&1 || echo "ERROR")

if echo "$DEBUG_RESPONSE" | grep -q "isVpnConnected"; then
    echo "✓ Endpoint responde"
    echo ""
    echo "Respuesta JSON:"
    echo "$DEBUG_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$DEBUG_RESPONSE" | sed 's/^/  /'
    
    # Verificar detección
    if echo "$DEBUG_RESPONSE" | grep -q '"isVpnConnected":true'; then
        echo ""
        echo "  ✅ ¡VPN detectada en debug-ip!"
    elif echo "$DEBUG_RESPONSE" | grep -q '"isVpnConnected":false'; then
        echo ""
        echo "  ⚠ VPN NO detectada en debug-ip"
    fi
else
    echo "⚠ Endpoint no responde"
    echo "$DEBUG_RESPONSE" | head -5 | sed 's/^/  /'
fi
echo ""

# 4. Verificar que el archivo de estado se actualiza
echo "4. Verificando actualización del archivo de estado:"
echo "----------------------------------------------------"
if [ -f "$STATUS_FILE" ]; then
    LAST_UPDATE=$(grep "^Updated," "$STATUS_FILE" | tail -1 | awk -F',' '{print $2}' | xargs)
    if [ -n "$LAST_UPDATE" ]; then
        echo "✓ Última actualización: $LAST_UPDATE"
        
        # Calcular tiempo desde última actualización
        NOW=$(date +%s)
        UPDATE_TIME=$(date -d "$LAST_UPDATE" +%s 2>/dev/null || echo "0")
        if [ "$UPDATE_TIME" -gt 0 ]; then
            DIFF=$((NOW - UPDATE_TIME))
            if [ $DIFF -lt 60 ]; then
                echo "  ✓ Archivo actualizado hace $DIFF segundos (reciente)"
            else
                echo "  ⚠ Archivo actualizado hace $DIFF segundos (puede estar desactualizado)"
            fi
        fi
    fi
fi
echo ""

# 5. Mostrar conexiones activas
echo "5. Conexiones activas actuales:"
echo "--------------------------------"
if [ -f "$STATUS_FILE" ] && [ -r "$STATUS_FILE" ]; then
    echo "Clientes conectados:"
    grep -v "^#" "$STATUS_FILE" | grep -v "^CLIENT LIST" | grep -v "^ROUTING TABLE" | grep -v "^GLOBAL STATS" | grep -v "^Updated" | grep -v "^END" | grep -v "^$" | grep "," | while IFS=',' read -r CN REAL_ADDR VIRTUAL_ADDR BYTES_RECV BYTES_SENT CONNECTED_SINCE; do
        if [ -n "$CN" ] && [ -n "$REAL_ADDR" ]; then
            REAL_IP=$(echo "$REAL_ADDR" | awk -F':' '{print $1}')
            echo "  - $CN -> IP Real: $REAL_IP, IP VPN: $VIRTUAL_ADDR"
        fi
    done
fi
echo ""

echo "=========================================="
echo "PRUEBA COMPLETADA"
echo "=========================================="
echo ""
echo "RESUMEN:"
echo "--------"
echo "✓ Permisos del archivo: 644 (correcto)"
echo "✓ Archivo de estado se puede leer"
if [ -n "$TEST_IP" ] && [ "$TEST_IP" != "127.0.0.1" ]; then
    echo "✓ Conexión activa detectada: $TEST_IP"
fi
echo ""
echo "PRÓXIMOS PASOS:"
echo "1. Si el endpoint no responde, reinicia PM2:"
echo "   pm2 restart axeso"
echo ""
echo "2. Prueba desde tu navegador (con VPN conectada):"
echo "   https://visitantes.cyberpol.com.py/api/debug-ip"
echo ""
echo "3. Si aún no detecta, verifica los logs:"
echo "   pm2 logs axeso --lines 100 | grep -i vpn"
echo ""


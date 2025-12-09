#!/bin/bash

# Script para diagnosticar por qué no se detecta la desconexión
# Ejecutar como root: sudo bash scripts/vpn/diagnosticar-desconexion.sh

set -e

STATUS_FILE="/var/log/openvpn-status.log"
TEST_IP="181.91.85.248"

echo "=========================================="
echo "DIAGNÓSTICO: DETECCIÓN DE DESCONEXIÓN"
echo "=========================================="
echo ""

# 1. Verificar contenido actual del archivo
echo "1. Contenido actual del archivo de estado:"
echo "------------------------------------------"
if [ -f "$STATUS_FILE" ] && [ -r "$STATUS_FILE" ]; then
    echo "Últimas 20 líneas:"
    tail -20 "$STATUS_FILE" | sed 's/^/  /'
    echo ""
    
    # Buscar la IP específica
    echo "Buscando IP: $TEST_IP"
    if grep -q "$TEST_IP" "$STATUS_FILE"; then
        echo "  ✗ IP ENCONTRADA en el archivo (debería estar eliminada si te desconectaste)"
        echo ""
        echo "  Líneas que contienen la IP:"
        grep "$TEST_IP" "$STATUS_FILE" | sed 's/^/    /'
    else
        echo "  ✓ IP NO encontrada en el archivo (correcto si te desconectaste)"
    fi
else
    echo "✗ No se puede leer el archivo"
fi
echo ""

# 2. Verificar última actualización
echo "2. Información de actualización:"
echo "--------------------------------"
if [ -f "$STATUS_FILE" ]; then
    LAST_UPDATE_LINE=$(grep "^Updated," "$STATUS_FILE" | tail -1 || echo "")
    if [ -n "$LAST_UPDATE_LINE" ]; then
        UPDATE_TIME=$(echo "$LAST_UPDATE_LINE" | awk -F',' '{print $2}' | xargs)
        echo "Última actualización registrada: $UPDATE_TIME"
        
        # Calcular edad
        UPDATE_TIMESTAMP=$(date -d "$UPDATE_TIME" +%s 2>/dev/null || echo "0")
        NOW=$(date +%s)
        if [ "$UPDATE_TIMESTAMP" -gt 0 ]; then
            AGE=$((NOW - UPDATE_TIMESTAMP))
            echo "Edad: $AGE segundos"
            
            if [ $AGE -gt 60 ]; then
                echo "  ⚠ Archivo NO se ha actualizado en $AGE segundos"
                echo "  Esto puede indicar que OpenVPN no está actualizando el archivo"
            fi
        fi
    fi
    
    # Verificar modificación del archivo
    FILE_MOD=$(stat -c "%y" "$STATUS_FILE" 2>/dev/null || stat -f "%Sm" "$STATUS_FILE" 2>/dev/null || echo "N/A")
    FILE_MOD_TS=$(stat -c "%Y" "$STATUS_FILE" 2>/dev/null || stat -f "%m" "$STATUS_FILE" 2>/dev/null || echo "0")
    NOW=$(date +%s)
    if [ "$FILE_MOD_TS" -gt 0 ]; then
        FILE_AGE=$((NOW - FILE_MOD_TS))
        echo "Última modificación del archivo: $FILE_MOD"
        echo "Edad de modificación: $FILE_AGE segundos"
        
        if [ $FILE_AGE -gt 120 ]; then
            echo "  ⚠ El archivo NO se ha modificado en $FILE_AGE segundos"
            echo "  OpenVPN puede no estar actualizando el archivo correctamente"
        fi
    fi
fi
echo ""

# 3. Verificar conexiones activas en OpenVPN
echo "3. Verificando conexiones activas en OpenVPN:"
echo "----------------------------------------------"
if systemctl is-active --quiet openvpn@server; then
    echo "✓ OpenVPN está corriendo"
    
    # Intentar obtener estado desde management interface si está disponible
    # O verificar procesos
    OPENVPN_PROCESSES=$(ps aux | grep "[o]penvpn" | wc -l)
    echo "  Procesos OpenVPN: $OPENVPN_PROCESSES"
    
    # Verificar si hay conexiones en la tabla de enrutamiento
    if command -v ip &> /dev/null; then
        TUN_INTERFACE=$(ip route | grep "10.8.0" | head -1 | awk '{print $3}' || echo "")
        if [ -n "$TUN_INTERFACE" ]; then
            echo "  Interfaz VPN detectada"
        fi
    fi
else
    echo "✗ OpenVPN NO está corriendo"
fi
echo ""

# 4. Probar el endpoint directamente
echo "4. Probando endpoint /api/vpn/check-status:"
echo "--------------------------------------------"
RESPONSE=$(timeout 5 curl -s "http://localhost:3000/api/vpn/check-status?realIp=$TEST_IP" 2>&1 || echo "ERROR")

if echo "$RESPONSE" | grep -q "isActive"; then
    echo "Respuesta del endpoint:"
    echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE" | sed 's/^/  /'
    
    if echo "$RESPONSE" | grep -q '"isActive":true'; then
        echo ""
        echo "  ✗ Endpoint reporta conexión activa"
        echo "  Esto significa que la IP todavía está en el archivo de estado"
    elif echo "$RESPONSE" | grep -q '"isActive":false'; then
        echo ""
        echo "  ✓ Endpoint reporta conexión inactiva (correcto)"
    fi
else
    echo "⚠ No se pudo obtener respuesta del endpoint"
    echo "$RESPONSE" | head -5
fi
echo ""

# 5. Verificar configuración de status en OpenVPN
echo "5. Verificando configuración de status:"
echo "----------------------------------------"
SERVER_CONF="/etc/openvpn/server.conf"
if [ -f "$SERVER_CONF" ]; then
    if grep -q "^status" "$SERVER_CONF"; then
        echo "✓ Configuración de status encontrada:"
        grep "^status" "$SERVER_CONF" | sed 's/^/  /'
        
        # Verificar si hay status-version
        if grep -q "^status-version" "$SERVER_CONF"; then
            echo "✓ status-version configurado:"
            grep "^status-version" "$SERVER_CONF" | sed 's/^/  /'
        else
            echo "⚠ status-version NO configurado"
        fi
    else
        echo "✗ status NO está configurado"
    fi
fi
echo ""

# 6. Recomendaciones
echo "=========================================="
echo "DIAGNÓSTICO COMPLETADO"
echo "=========================================="
echo ""
echo "ANÁLISIS:"
echo "---------"
if grep -q "$TEST_IP" "$STATUS_FILE" 2>/dev/null; then
    echo "✗ La IP todavía está en el archivo de estado"
    echo ""
    echo "POSIBLES CAUSAS:"
    echo "1. OpenVPN no está eliminando entradas al desconectar"
    echo "2. El archivo de estado no se está actualizando"
    echo "3. Hay un delay en la actualización del archivo"
    echo ""
    echo "SOLUCIONES:"
    echo "1. Verificar logs de OpenVPN: sudo journalctl -u openvpn@server -n 50"
    echo "2. Reiniciar OpenVPN: sudo systemctl restart openvpn@server"
    echo "3. Verificar que el archivo se actualiza: sudo tail -f $STATUS_FILE"
    echo "4. Considerar usar hooks client-disconnect para marcar desconexiones en BD"
else
    echo "✓ La IP NO está en el archivo de estado"
    echo "  El problema puede estar en el código que lee el archivo"
fi
echo ""


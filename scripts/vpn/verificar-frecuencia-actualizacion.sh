#!/bin/bash

# Script para verificar la frecuencia de actualización del archivo de estado
# Ejecutar como root: sudo bash scripts/vpn/verificar-frecuencia-actualizacion.sh

set -e

SERVER_CONF="/etc/openvpn/server.conf"
STATUS_FILE="/var/log/openvpn-status.log"

echo "=========================================="
echo "VERIFICACIÓN: FRECUENCIA DE ACTUALIZACIÓN"
echo "=========================================="
echo ""

# 1. Verificar configuración de status en server.conf
echo "1. Verificando configuración de status:"
echo "----------------------------------------"
if grep -q "^status" "$SERVER_CONF"; then
    echo "✓ Configuración encontrada:"
    grep "^status" "$SERVER_CONF" | sed 's/^/  /'
    
    # Verificar si hay status-version
    if grep -q "^status-version" "$SERVER_CONF"; then
        echo "✓ status-version configurado:"
        grep "^status-version" "$SERVER_CONF" | sed 's/^/  /'
    else
        echo "⚠ status-version NO configurado"
        echo "  Agregando status-version 2..."
        echo "status-version 2" >> "$SERVER_CONF"
        systemctl restart openvpn@server
        sleep 2
        echo "✓ status-version agregado y OpenVPN reiniciado"
    fi
else
    echo "✗ status NO está configurado"
fi
echo ""

# 2. Monitorear actualizaciones del archivo
echo "2. Monitoreando actualizaciones del archivo (30 segundos):"
echo "-----------------------------------------------------------"
if [ -f "$STATUS_FILE" ]; then
    echo "Observando cambios en: $STATUS_FILE"
    echo "Presiona Ctrl+C para detener"
    echo ""
    
    LAST_UPDATE=$(stat -c "%Y" "$STATUS_FILE" 2>/dev/null || stat -f "%m" "$STATUS_FILE" 2>/dev/null || echo "0")
    echo "Última actualización inicial: $(date -d "@$LAST_UPDATE" 2>/dev/null || echo "N/A")"
    echo ""
    
    # Monitorear por 30 segundos
    for i in {1..30}; do
        sleep 1
        CURRENT_UPDATE=$(stat -c "%Y" "$STATUS_FILE" 2>/dev/null || stat -f "%m" "$STATUS_FILE" 2>/dev/null || echo "0")
        
        if [ "$CURRENT_UPDATE" != "$LAST_UPDATE" ]; then
            echo "[$(date +%H:%M:%S)] ✓ Archivo actualizado"
            LAST_UPDATE=$CURRENT_UPDATE
            
            # Mostrar última línea de actualización
            LAST_LINE=$(grep "^Updated," "$STATUS_FILE" | tail -1 || echo "")
            if [ -n "$LAST_LINE" ]; then
                echo "  $LAST_LINE"
            fi
        fi
    done
    
    echo ""
    echo "✓ Monitoreo completado"
else
    echo "⚠ Archivo no existe (se creará cuando alguien se conecte)"
fi
echo ""

# 3. Verificar última actualización
echo "3. Información de última actualización:"
echo "----------------------------------------"
if [ -f "$STATUS_FILE" ]; then
    LAST_UPDATE_LINE=$(grep "^Updated," "$STATUS_FILE" | tail -1 || echo "")
    if [ -n "$LAST_UPDATE_LINE" ]; then
        UPDATE_TIME=$(echo "$LAST_UPDATE_LINE" | awk -F',' '{print $2}' | xargs)
        echo "Última actualización registrada: $UPDATE_TIME"
        
        # Calcular edad
        if command -v date &> /dev/null; then
            UPDATE_TIMESTAMP=$(date -d "$UPDATE_TIME" +%s 2>/dev/null || echo "0")
            NOW=$(date +%s)
            if [ "$UPDATE_TIMESTAMP" -gt 0 ]; then
                AGE=$((NOW - UPDATE_TIMESTAMP))
                echo "Edad: $AGE segundos"
                
                if [ $AGE -lt 10 ]; then
                    echo "  ✓ Muy reciente (< 10 segundos)"
                elif [ $AGE -lt 60 ]; then
                    echo "  ✓ Reciente (< 1 minuto)"
                else
                    echo "  ⚠ Puede estar desactualizado (> 1 minuto)"
                fi
            fi
        fi
    else
        echo "⚠ No se encontró línea de actualización"
    fi
    
    # Verificar modificación del archivo
    FILE_MOD=$(stat -c "%y" "$STATUS_FILE" 2>/dev/null || stat -f "%Sm" "$STATUS_FILE" 2>/dev/null || echo "N/A")
    echo "Última modificación del archivo: $FILE_MOD"
else
    echo "⚠ Archivo no existe"
fi
echo ""

# 4. Recomendaciones
echo "4. Recomendaciones:"
echo "-------------------"
echo "OpenVPN actualiza el archivo de estado periódicamente."
echo "La frecuencia depende de la configuración, pero típicamente es cada 1-10 segundos."
echo ""
echo "Si el archivo no se actualiza inmediatamente al desconectar:"
echo "1. Esto es normal - OpenVPN actualiza periódicamente, no en tiempo real"
echo "2. El sistema detectará la desconexión en la próxima actualización"
echo "3. Para actualizaciones más frecuentes, puedes agregar 'status' con intervalo"
echo ""
echo "Para verificar en tiempo real:"
echo "  sudo tail -f $STATUS_FILE"
echo ""


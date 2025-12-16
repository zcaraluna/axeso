#!/bin/bash

# Script para verificar si una IP aparece en el archivo de estado de OpenVPN
# Uso: sudo bash scripts/vpn/verificar-ip-en-archivo.sh [IP]

STATUS_FILE="/var/log/openvpn-status.log"
IP_TO_CHECK="${1:-181.91.85.248}"

echo "=========================================="
echo "VERIFICACIÓN DE IP EN ARCHIVO DE ESTADO"
echo "=========================================="
echo ""
echo "IP a verificar: $IP_TO_CHECK"
echo "Archivo: $STATUS_FILE"
echo ""

if [ ! -f "$STATUS_FILE" ]; then
    echo "✗ ERROR: Archivo no existe: $STATUS_FILE"
    exit 1
fi

echo "1. BÚSQUEDA SIMPLE:"
echo "-------------------"
if grep -q "$IP_TO_CHECK" "$STATUS_FILE"; then
    echo "✓ IP encontrada en el archivo"
    echo ""
    echo "2. LÍNEAS QUE CONTIENEN LA IP:"
    echo "-------------------------------"
    grep -n "$IP_TO_CHECK" "$STATUS_FILE" | sed 's/^/  /'
    echo ""
    echo "3. ANÁLISIS DE CADA LÍNEA:"
    echo "--------------------------"
    grep "$IP_TO_CHECK" "$STATUS_FILE" | while IFS= read -r line; do
        echo "  Línea: [$line]"
        if [[ "$line" == *"CLIENT_LIST"* ]]; then
            echo "    → Tipo: CLIENT_LIST"
        elif [[ "$line" == *"ROUTING_TABLE"* ]]; then
            echo "    → Tipo: ROUTING_TABLE"
        else
            echo "    → Tipo: Otra sección"
        fi
        echo ""
    done
else
    echo "✗ IP NO encontrada en el archivo"
    echo ""
    echo "Esto significa que:"
    echo "  - La conexión VPN está desconectada"
    echo "  - O el archivo no se ha actualizado aún"
    echo ""
    echo "Última actualización del archivo:"
    ls -lh "$STATUS_FILE" | awk '{print "  " $6 " " $7 " " $8}'
fi

echo ""
echo "4. CONTENIDO COMPLETO DEL ARCHIVO:"
echo "-----------------------------------"
cat "$STATUS_FILE"
echo ""


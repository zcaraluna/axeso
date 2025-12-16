#!/bin/bash

# Script para verificar el formato exacto del archivo de estado
# Uso: sudo bash scripts/vpn/verificar-formato-archivo.sh

STATUS_FILE="/var/log/openvpn-status.log"

echo "=========================================="
echo "VERIFICACIÓN DE FORMATO DEL ARCHIVO"
echo "=========================================="
echo ""

if [ ! -f "$STATUS_FILE" ]; then
    echo "✗ ERROR: Archivo no existe: $STATUS_FILE"
    exit 1
fi

echo "1. CONTENIDO COMPLETO DEL ARCHIVO:"
echo "-----------------------------------"
cat "$STATUS_FILE"
echo ""
echo ""

echo "2. ANÁLISIS LÍNEA POR LÍNEA:"
echo "-----------------------------"
line_num=0
while IFS= read -r line; do
    line_num=$((line_num + 1))
    echo "Línea $line_num: [$line]"
    
    # Detectar tipo de línea
    trimmed=$(echo "$line" | xargs)
    if [[ "$trimmed" == "OpenVPN CLIENT LIST" ]] || [[ "$trimmed" == "CLIENT LIST" ]]; then
        echo "  → Tipo: HEADER CLIENT LIST"
    elif [[ "$trimmed" == "ROUTING TABLE" ]]; then
        echo "  → Tipo: HEADER ROUTING TABLE"
    elif [[ "$trimmed" == "GLOBAL STATS" ]] || [[ "$trimmed" == "END" ]]; then
        echo "  → Tipo: FIN DE SECCIÓN"
    elif [[ "$trimmed" == Updated,* ]]; then
        echo "  → Tipo: TIMESTAMP"
    elif [[ "$trimmed" == Common\ Name,* ]] || [[ "$trimmed" == Virtual\ Address,* ]]; then
        echo "  → Tipo: ENCABEZADO DE COLUMNAS"
    elif [[ "$trimmed" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+ ]] || [[ "$trimmed" =~ 181\.91\.85\.248 ]]; then
        echo "  → Tipo: LÍNEA CON IP (posible conexión)"
        # Mostrar campos separados por comas
        IFS=',' read -ra FIELDS <<< "$line"
        echo "    Campos encontrados: ${#FIELDS[@]}"
        for i in "${!FIELDS[@]}"; do
            echo "      Campo $i: [${FIELDS[$i]}]"
        done
    elif [[ -n "$trimmed" ]] && [[ ! "$trimmed" =~ ^# ]]; then
        echo "  → Tipo: LÍNEA DE DATOS"
        # Intentar parsear como CSV
        IFS=',' read -ra FIELDS <<< "$line"
        if [ ${#FIELDS[@]} -ge 2 ]; then
            echo "    Campos encontrados: ${#FIELDS[@]}"
            echo "    Campo 0 (Common Name): [${FIELDS[0]}]"
            echo "    Campo 1 (Real Address): [${FIELDS[1]}]"
            if [ ${#FIELDS[@]} -ge 3 ]; then
                echo "    Campo 2 (Virtual Address): [${FIELDS[2]}]"
            fi
        fi
    fi
    echo ""
done < "$STATUS_FILE"

echo ""
echo "3. BUSCANDO IP 181.91.85.248:"
echo "-----------------------------"
if grep -q "181.91.85.248" "$STATUS_FILE"; then
    echo "✓ IP encontrada en el archivo"
    echo ""
    echo "Líneas que contienen la IP:"
    grep -n "181.91.85.248" "$STATUS_FILE" | sed 's/^/  /'
    echo ""
    echo "Análisis de cada línea:"
    grep "181.91.85.248" "$STATUS_FILE" | while IFS= read -r line; do
        echo "  Línea: [$line]"
        IFS=',' read -ra FIELDS <<< "$line"
        echo "    Total campos: ${#FIELDS[@]}"
        for i in "${!FIELDS[@]}"; do
            echo "    [$i]: [${FIELDS[$i]}]"
        done
        echo ""
    done
else
    echo "✗ IP NO encontrada en el archivo"
    echo ""
    echo "Esto puede significar:"
    echo "  1. No estás conectado a la VPN"
    echo "  2. La conexión VPN no está registrada en el archivo"
    echo "  3. OpenVPN no está actualizando el archivo correctamente"
fi

echo ""
echo "4. VERIFICANDO SECCIONES:"
echo "------------------------"
if grep -q "CLIENT LIST" "$STATUS_FILE"; then
    echo "✓ Sección CLIENT LIST encontrada"
    echo "  Líneas en CLIENT LIST:"
    awk '/CLIENT LIST/,/ROUTING TABLE|GLOBAL STATS|END/ {print NR": "$0}' "$STATUS_FILE" | head -20 | sed 's/^/    /'
else
    echo "✗ Sección CLIENT LIST NO encontrada"
fi

echo ""
if grep -q "ROUTING TABLE" "$STATUS_FILE"; then
    echo "✓ Sección ROUTING TABLE encontrada"
    echo "  Líneas en ROUTING TABLE:"
    awk '/ROUTING TABLE/,/GLOBAL STATS|END/ {print NR": "$0}' "$STATUS_FILE" | head -20 | sed 's/^/    /'
else
    echo "✗ Sección ROUTING TABLE NO encontrada"
fi

echo ""
echo "5. RECOMENDACIONES:"
echo "-------------------"
echo "Si la IP no aparece en el archivo:"
echo "  1. Verifica que estás conectado: sudo systemctl status openvpn@server"
echo "  2. Verifica el archivo en tiempo real: sudo tail -f $STATUS_FILE"
echo "  3. Conecta/desconecta la VPN y observa cambios en el archivo"
echo ""
echo "Si la IP aparece pero no se detecta:"
echo "  1. Compara el formato de las líneas con el código de parsing"
echo "  2. Verifica que el código busca en las columnas correctas"
echo "  3. Revisa los logs de la aplicación para ver qué está buscando"


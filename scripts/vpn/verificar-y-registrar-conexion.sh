#!/bin/bash

# Script para verificar conexiones VPN activas y registrarlas manualmente
# Uso: sudo bash scripts/vpn/verificar-y-registrar-conexion.sh

set -e

OPENVPN_STATUS="/var/log/openvpn-status.log"
API_URL="${VPN_API_URL:-http://localhost:3000}"
API_TOKEN="${VPN_API_TOKEN:-}"

echo "=========================================="
echo "VERIFICACIÓN Y REGISTRO DE CONEXIONES VPN"
echo "=========================================="
echo ""

# Verificar si existe el archivo de estado
if [ ! -f "$OPENVPN_STATUS" ]; then
    echo "Error: No se encontró $OPENVPN_STATUS"
    echo "Verifica que OpenVPN esté configurado para generar este archivo"
    exit 1
fi

echo "1. Conexiones VPN activas:"
echo "---------------------------"
# Leer el archivo de estado y extraer conexiones activas
# El formato es: Common Name,Real Address,Virtual Address,Bytes Received,Bytes Sent,Connected Since
while IFS=',' read -r common_name real_address virtual_address bytes_recv bytes_sent connected_since; do
    # Limpiar espacios
    common_name=$(echo "$common_name" | xargs)
    real_address=$(echo "$real_address" | cut -d':' -f1 | xargs)  # Solo IP, sin puerto
    virtual_address=$(echo "$virtual_address" | xargs)
    
    # Saltar líneas vacías o de encabezado
    if [[ -z "$common_name" ]] || [[ "$common_name" == "Common Name" ]] || [[ "$common_name" == "ROUTING TABLE" ]] || [[ "$common_name" == "GLOBAL STATS" ]]; then
        continue
    fi
    
    # Saltar líneas de separador
    if [[ "$common_name" == *"---"* ]]; then
        continue
    fi
    
    if [[ -n "$common_name" ]] && [[ -n "$real_address" ]] && [[ "$real_address" != "Real Address" ]]; then
        echo "  Certificado: $common_name"
        echo "  IP Pública: $real_address"
        echo "  IP VPN: $virtual_address"
        echo "  Conectado desde: $connected_since"
        echo ""
        
        # Si hay API_TOKEN, registrar la conexión
        if [[ -n "$API_TOKEN" ]]; then
            echo "  Registrando en base de datos..."
            curl -s -X POST "$API_URL/api/vpn/connections" \
                -H "Content-Type: application/json" \
                -H "X-API-Token: $API_TOKEN" \
                -d "{
                    \"certificateName\": \"$common_name\",
                    \"ipAddress\": \"$virtual_address\",
                    \"realIpAddress\": \"$real_address\",
                    \"bytesReceived\": ${bytes_recv:-0},
                    \"bytesSent\": ${bytes_sent:-0}
                }" > /dev/null
            
            if [ $? -eq 0 ]; then
                echo "  ✓ Conexión registrada"
            else
                echo "  ✗ Error al registrar conexión"
            fi
        else
            echo "  ⚠ VPN_API_TOKEN no configurado, no se puede registrar automáticamente"
        fi
        echo ""
    fi
done < <(grep -A 1000 "CLIENT LIST" "$OPENVPN_STATUS" | grep -B 1000 "ROUTING TABLE" | head -n -1 | tail -n +2)

echo ""
echo "2. Para ver todas las conexiones activas:"
echo "   sudo cat $OPENVPN_STATUS"
echo ""
echo "3. Para registrar manualmente una conexión:"
echo "   curl -X POST $API_URL/api/vpn/connections \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -H 'X-API-Token: \$VPN_API_TOKEN' \\"
echo "     -d '{\"certificateName\": \"NOMBRE\", \"ipAddress\": \"10.8.0.X\", \"realIpAddress\": \"IP_PUBLICA\"}'"
echo ""


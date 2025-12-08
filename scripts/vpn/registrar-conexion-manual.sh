#!/bin/bash

# Script para registrar manualmente una conexión VPN activa
# Uso: sudo bash scripts/vpn/registrar-conexion-manual.sh

set -e

PROJECT_DIR="/home/cyberpol/web/visitantes.cyberpol.com.py/public_html"
ENV_FILE="$PROJECT_DIR/.env"
API_URL="http://localhost:3000"

echo "=========================================="
echo "REGISTRO MANUAL DE CONEXIÓN VPN"
echo "=========================================="
echo ""

# Cargar variables de entorno
if [ -f "$ENV_FILE" ]; then
    export $(grep -v '^#' "$ENV_FILE" | grep VPN_API_TOKEN | xargs)
fi

if [ -z "$VPN_API_TOKEN" ]; then
    echo "Error: VPN_API_TOKEN no está configurado en .env"
    exit 1
fi

echo "1. Verificando conexiones VPN activas..."
echo "----------------------------------------"
OPENVPN_STATUS="/var/log/openvpn-status.log"

if [ ! -f "$OPENVPN_STATUS" ]; then
    echo "Error: No se encontró $OPENVPN_STATUS"
    exit 1
fi

# Mostrar el contenido del archivo para debugging
echo "Contenido del archivo de estado:"
echo "---------------------------------"
cat "$OPENVPN_STATUS"
echo ""
echo ""

# Extraer información de conexiones activas
# El formato es: Common Name,Real Address,Virtual Address,Bytes Received,Bytes Sent,Connected Since
echo "2. Conexiones encontradas:"
echo "---------------------------"

# Buscar la sección CLIENT LIST
in_client_list=false
while IFS= read -r line; do
    # Detectar inicio de CLIENT LIST
    if [[ "$line" == *"CLIENT LIST"* ]]; then
        in_client_list=true
        continue
    fi
    
    # Detectar fin de CLIENT LIST (cuando encontramos ROUTING TABLE o línea vacía con separadores)
    if [[ "$in_client_list" == true ]] && [[ "$line" == *"ROUTING TABLE"* ]]; then
        break
    fi
    
    # Si estamos en CLIENT LIST y la línea no es encabezado ni separador
    if [[ "$in_client_list" == true ]] && [[ -n "$line" ]] && [[ "$line" != *"Common Name"* ]] && [[ "$line" != *"---"* ]] && [[ "$line" != "Updated"* ]]; then
        # Parsear línea CSV
        IFS=',' read -r -a fields <<< "$line"
        
        if [ ${#fields[@]} -ge 3 ]; then
            common_name=$(echo "${fields[0]}" | xargs)
            real_address=$(echo "${fields[1]}" | cut -d':' -f1 | xargs)  # Solo IP, sin puerto
            virtual_address=$(echo "${fields[2]}" | xargs)
            bytes_recv="${fields[3]:-0}"
            bytes_sent="${fields[4]:-0}"
            connected_since="${fields[5]:-}"
            
            # Validar que tenemos datos válidos
            if [[ -n "$common_name" ]] && [[ -n "$real_address" ]] && [[ "$real_address" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
                echo "  Certificado: $common_name"
                echo "  IP Pública: $real_address"
                echo "  IP VPN: $virtual_address"
                echo "  Conectado desde: $connected_since"
                echo ""
                
                # Registrar en base de datos
                echo "  Registrando en base de datos..."
                response=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/api/vpn/connections" \
                    -H "Content-Type: application/json" \
                    -H "X-API-Token: $VPN_API_TOKEN" \
                    -d "{
                        \"certificateName\": \"$common_name\",
                        \"ipAddress\": \"$virtual_address\",
                        \"realIpAddress\": \"$real_address\",
                        \"bytesReceived\": ${bytes_recv:-0},
                        \"bytesSent\": ${bytes_sent:-0}
                    }")
                
                http_code=$(echo "$response" | tail -n1)
                body=$(echo "$response" | head -n-1)
                
                if [ "$http_code" -eq 200 ] || [ "$http_code" -eq 201 ]; then
                    echo "  ✓ Conexión registrada exitosamente"
                    echo "  Respuesta: $body"
                else
                    echo "  ✗ Error al registrar conexión (HTTP $http_code)"
                    echo "  Respuesta: $body"
                fi
                echo ""
            fi
        fi
    fi
done < "$OPENVPN_STATUS"

echo ""
echo "3. Verificar registro:"
echo "----------------------"
echo "  curl -H 'X-API-Token: \$VPN_API_TOKEN' '$API_URL/api/vpn/connections?check=true&realIp=181.91.85.248'"
echo ""


#!/bin/bash

# Script para registrar una conexión VPN directamente
# Uso: sudo bash scripts/vpn/registrar-conexion-directa.sh <certificate_name> <vpn_ip> <public_ip>

set -e

PROJECT_DIR="/home/cyberpol/web/visitantes.cyberpol.com.py/public_html"
ENV_FILE="$PROJECT_DIR/.env"
API_URL="http://localhost:3000"

CERT_NAME="${1:-ADMIN-GARV1}"
VPN_IP="${2:-10.8.0.6}"
PUBLIC_IP="${3:-181.91.85.248}"

echo "=========================================="
echo "REGISTRO DIRECTO DE CONEXIÓN VPN"
echo "=========================================="
echo ""

# Cargar variables de entorno
if [ -f "$ENV_FILE" ]; then
    export $(grep -v '^#' "$ENV_FILE" | grep VPN_API_TOKEN | xargs)
fi

if [ -z "$VPN_API_TOKEN" ]; then
    echo "Error: VPN_API_TOKEN no está configurado en .env"
    echo "Verificando .env..."
    if [ -f "$ENV_FILE" ]; then
        grep VPN_API_TOKEN "$ENV_FILE" || echo "  No se encontró VPN_API_TOKEN"
    fi
    exit 1
fi

echo "Parámetros:"
echo "  Certificado: $CERT_NAME"
echo "  IP VPN: $VPN_IP"
echo "  IP Pública: $PUBLIC_IP"
echo ""

# Registrar en base de datos
echo "Registrando conexión..."
echo "URL: $API_URL/api/vpn/connections"
echo "Token: ${VPN_API_TOKEN:0:10}..." # Mostrar solo primeros 10 caracteres del token

response=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST "$API_URL/api/vpn/connections" \
    -H "Content-Type: application/json" \
    -H "X-API-Token: $VPN_API_TOKEN" \
    -d "{
        \"certificateName\": \"$CERT_NAME\",
        \"ipAddress\": \"$VPN_IP\",
        \"realIpAddress\": \"$PUBLIC_IP\",
        \"bytesReceived\": 0,
        \"bytesSent\": 0
    }" 2>&1)

http_code=$(echo "$response" | grep "HTTP_CODE:" | cut -d':' -f2)
body=$(echo "$response" | grep -v "HTTP_CODE:")

echo ""
if [ -z "$http_code" ]; then
    echo "✗ Error: No se recibió respuesta del servidor"
    echo "Respuesta completa: $response"
    exit 1
elif [ "$http_code" -eq 200 ] || [ "$http_code" -eq 201 ]; then
    echo "✓ Conexión registrada exitosamente (HTTP $http_code)"
    echo "Respuesta: $body"
else
    echo "✗ Error al registrar conexión (HTTP $http_code)"
    echo "Respuesta: $body"
    exit 1
fi

echo ""
echo "Verificando registro..."
check_response=$(curl -s -X GET "$API_URL/api/vpn/connections?check=true&realIp=$PUBLIC_IP" \
    -H "X-API-Token: $VPN_API_TOKEN")

echo "Resultado de verificación: $check_response"
echo ""

if echo "$check_response" | grep -q '"isActive":true'; then
    echo "✓ La conexión está activa y registrada correctamente"
else
    echo "⚠ La conexión puede no estar activa aún"
fi


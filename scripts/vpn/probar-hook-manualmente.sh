#!/bin/bash

# Script para probar el hook manualmente con las mismas variables de entorno que OpenVPN
# Ejecutar como root: sudo bash scripts/vpn/probar-hook-manualmente.sh

echo "=========================================="
echo "PRUEBA MANUAL DEL HOOK"
echo "=========================================="
echo ""

PROJECT_DIR="/home/cyberpol/web/visitantes.cyberpol.com.py/public_html"
SCRIPT_JS="$PROJECT_DIR/scripts/vpn/register-connection.js"
ENV_FILE="$PROJECT_DIR/.env"

# Simular variables de entorno de OpenVPN
export common_name="TEST-CERT"
export ifconfig_pool_remote_ip="10.8.0.99"
export trusted_ip="181.91.85.248"
export VPN_API_URL="http://localhost:3000"

# Cargar VPN_API_TOKEN desde .env
if [ -f "$ENV_FILE" ] && grep -q "VPN_API_TOKEN" "$ENV_FILE"; then
    export VPN_API_TOKEN=$(grep "^VPN_API_TOKEN=" "$ENV_FILE" | cut -d'=' -f2 | tr -d '"' | tr -d "'" | tr -d ' ' | head -1)
    echo "✓ VPN_API_TOKEN cargado desde .env"
else
    echo "✗ VPN_API_TOKEN no encontrado en .env"
    exit 1
fi

echo ""
echo "Variables de entorno simuladas:"
echo "  common_name: $common_name"
echo "  ifconfig_pool_remote_ip: $ifconfig_pool_remote_ip"
echo "  trusted_ip: $trusted_ip"
echo "  VPN_API_URL: $VPN_API_URL"
echo "  VPN_API_TOKEN: ${VPN_API_TOKEN:0:10}..."
echo ""

if [ ! -f "$SCRIPT_JS" ]; then
    echo "✗ Error: Script no existe: $SCRIPT_JS"
    exit 1
fi

echo "Ejecutando script (debe terminar en menos de 1 segundo):"
echo "-------------------------------------------------------"
timeout 2 node "$SCRIPT_JS" 2>&1
EXIT_CODE=$?

echo ""
echo "Código de salida: $EXIT_CODE"
echo ""

if [ $EXIT_CODE -eq 0 ]; then
    echo "✓ Script terminó correctamente (código 0)"
else
    echo "✗ Script falló o tardó demasiado (código $EXIT_CODE)"
fi

echo ""
echo "Verificando si se registró la conexión en la BD:"
echo "------------------------------------------------"
sleep 1
if command -v psql &> /dev/null; then
    sudo -u postgres psql controldeacceso -c "SELECT \"certificateName\", \"ipAddress\", \"realIpAddress\", \"connectedAt\" FROM vpn_connections WHERE \"certificateName\" = 'TEST-CERT' ORDER BY \"connectedAt\" DESC LIMIT 1;" 2>/dev/null | sed 's/^/  /' || echo "  (error al consultar)"
fi
echo ""


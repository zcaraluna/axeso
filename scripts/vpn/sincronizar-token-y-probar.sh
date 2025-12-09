#!/bin/bash

# Script para sincronizar token y probar que funciona
# Ejecutar como root: sudo bash scripts/vpn/sincronizar-token-y-probar.sh

set -e

PROJECT_DIR="/home/cyberpol/web/visitantes.cyberpol.com.py/public_html"
ENV_FILE="$PROJECT_DIR/.env"
SYSTEMD_OVERRIDE="/etc/systemd/system/openvpn@server.service.d/override.conf"

echo "=========================================="
echo "SINCRONIZAR TOKEN Y PROBAR"
echo "=========================================="
echo ""

# 1. Obtener token de .env
echo "1. Obteniendo token de .env..."
echo "-------------------------------"
if [ ! -f "$ENV_FILE" ]; then
    echo "✗ Error: .env no existe: $ENV_FILE"
    exit 1
fi

if ! grep -q "VPN_API_TOKEN" "$ENV_FILE"; then
    echo "✗ Error: VPN_API_TOKEN no encontrado en .env"
    exit 1
fi

TOKEN_ENV=$(grep "^VPN_API_TOKEN=" "$ENV_FILE" | cut -d'=' -f2 | tr -d '"' | tr -d "'" | tr -d ' ' | head -1)

if [ -z "$TOKEN_ENV" ]; then
    echo "✗ Error: Token vacío en .env"
    exit 1
fi

echo "✓ Token obtenido: ${TOKEN_ENV:0:20}..."
echo ""

# 2. Actualizar override.conf
echo "2. Actualizando override.conf..."
echo "--------------------------------"
mkdir -p "$(dirname "$SYSTEMD_OVERRIDE")"
cat > "$SYSTEMD_OVERRIDE" <<EOF
[Service]
Environment="VPN_API_URL=http://localhost:3000"
Environment="VPN_API_TOKEN=$TOKEN_ENV"
Environment="NODE_ENV=production"
EOF
echo "✓ override.conf actualizado"
echo ""

# 3. Probar que el token funciona
echo "3. Probando que el token funciona..."
echo "-------------------------------------"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "x-api-token: $TOKEN_ENV" \
    "http://localhost:3000/api/vpn/connections?check=true&realIp=181.91.85.248" 2>/dev/null || echo "000")

if [ "$HTTP_CODE" = "200" ]; then
    echo "✓ Token funciona correctamente (HTTP 200)"
else
    echo "✗ Token NO funciona (HTTP $HTTP_CODE)"
    echo "  Respuesta:"
    curl -s -H "x-api-token: $TOKEN_ENV" \
        "http://localhost:3000/api/vpn/connections?check=true&realIp=181.91.85.248" 2>/dev/null | sed 's/^/    /'
fi
echo ""

# 4. Probar registro de conexión
echo "4. Probando registro de conexión..."
echo "-----------------------------------"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
    -H "Content-Type: application/json" \
    -H "x-api-token: $TOKEN_ENV" \
    -d '{"certificateName":"TEST-CERT","ipAddress":"10.8.0.99","realIpAddress":"181.91.85.248","bytesReceived":0,"bytesSent":0}' \
    "http://localhost:3000/api/vpn/connections" 2>/dev/null || echo "000")

if [ "$HTTP_CODE" = "201" ] || [ "$HTTP_CODE" = "200" ]; then
    echo "✓ Registro funciona (HTTP $HTTP_CODE)"
else
    echo "✗ Registro falló (HTTP $HTTP_CODE)"
    echo "  Respuesta:"
    curl -s -X POST \
        -H "Content-Type: application/json" \
        -H "x-api-token: $TOKEN_ENV" \
        -d '{"certificateName":"TEST-CERT","ipAddress":"10.8.0.99","realIpAddress":"181.91.85.248","bytesReceived":0,"bytesSent":0}' \
        "http://localhost:3000/api/vpn/connections" 2>/dev/null | sed 's/^/    /'
fi
echo ""

# 5. Recargar systemd y reiniciar OpenVPN
echo "5. Reiniciando OpenVPN..."
echo "-------------------------"
systemctl daemon-reload
systemctl restart openvpn@server

sleep 2

if systemctl is-active --quiet openvpn@server; then
    echo "✓ OpenVPN reiniciado"
else
    echo "✗ Error: OpenVPN no está corriendo"
    journalctl -u openvpn@server --no-pager -n 10
    exit 1
fi
echo ""

echo "=========================================="
echo "TOKEN SINCRONIZADO Y PROBADO"
echo "=========================================="
echo ""
echo "Ahora prueba conectarte desde Windows."
echo "Verifica los logs: sudo journalctl -u openvpn@server -f"
echo ""


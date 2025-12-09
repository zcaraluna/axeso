#!/bin/bash

# Script para verificar que el token de API funciona
# Ejecutar como root: sudo bash scripts/vpn/verificar-token-api.sh

echo "=========================================="
echo "VERIFICACIÓN DE TOKEN API"
echo "=========================================="
echo ""

PROJECT_DIR="/home/cyberpol/web/visitantes.cyberpol.com.py/public_html"
ENV_FILE="$PROJECT_DIR/.env"
SYSTEMD_OVERRIDE="/etc/systemd/system/openvpn@server.service.d/override.conf"

echo "1. Token en .env:"
echo "-----------------"
if [ -f "$ENV_FILE" ] && grep -q "VPN_API_TOKEN" "$ENV_FILE"; then
    TOKEN_ENV=$(grep "^VPN_API_TOKEN=" "$ENV_FILE" | cut -d'=' -f2 | tr -d '"' | tr -d "'" | tr -d ' ' | head -1)
    if [ -n "$TOKEN_ENV" ]; then
        echo "  ✓ Token encontrado: ${TOKEN_ENV:0:20}..."
        echo "  Longitud: ${#TOKEN_ENV} caracteres"
    else
        echo "  ✗ Token vacío"
    fi
else
    echo "  ✗ VPN_API_TOKEN no encontrado en .env"
fi
echo ""

echo "2. Token en override.conf:"
echo "--------------------------"
if [ -f "$SYSTEMD_OVERRIDE" ]; then
    TOKEN_OVERRIDE=$(grep "VPN_API_TOKEN" "$SYSTEMD_OVERRIDE" | cut -d'=' -f2 | tr -d '"' | tr -d "'" | tr -d ' ' | head -1)
    if [ -n "$TOKEN_OVERRIDE" ]; then
        echo "  ✓ Token encontrado: ${TOKEN_OVERRIDE:0:20}..."
        echo "  Longitud: ${TOKEN_OVERRIDE} caracteres"
    else
        echo "  ✗ Token vacío"
    fi
else
    echo "  ✗ override.conf no existe"
fi
echo ""

echo "3. Comparando tokens:"
echo "--------------------"
if [ -n "$TOKEN_ENV" ] && [ -n "$TOKEN_OVERRIDE" ]; then
    if [ "$TOKEN_ENV" = "$TOKEN_OVERRIDE" ]; then
        echo "  ✓ Los tokens COINCIDEN"
    else
        echo "  ✗ Los tokens NO coinciden"
        echo "    .env:      ${TOKEN_ENV:0:30}..."
        echo "    override:  ${TOKEN_OVERRIDE:0:30}..."
    fi
fi
echo ""

echo "4. Probando endpoint con token de .env:"
echo "---------------------------------------"
if [ -n "$TOKEN_ENV" ]; then
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -H "X-API-Token: $TOKEN_ENV" "http://localhost:3000/api/vpn/connections?check=true&realIp=181.91.85.248" 2>/dev/null || echo "000")
    if [ "$HTTP_CODE" = "200" ]; then
        echo "  ✓ Endpoint responde correctamente (HTTP 200)"
        echo "  Respuesta:"
        curl -s -H "X-API-Token: $TOKEN_ENV" "http://localhost:3000/api/vpn/connections?check=true&realIp=181.91.85.248" 2>/dev/null | sed 's/^/    /'
    else
        echo "  ✗ Endpoint NO responde correctamente (HTTP $HTTP_CODE)"
        echo "  Respuesta completa:"
        curl -s -H "X-API-Token: $TOKEN_ENV" "http://localhost:3000/api/vpn/connections?check=true&realIp=181.91.85.248" 2>/dev/null | sed 's/^/    /'
    fi
else
    echo "  ⚠ No se puede probar (token no encontrado)"
fi
echo ""

echo "5. Probando registro de conexión con token de .env:"
echo "---------------------------------------------------"
if [ -n "$TOKEN_ENV" ]; then
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
        -H "Content-Type: application/json" \
        -H "X-API-Token: $TOKEN_ENV" \
        -d '{"certificateName":"TEST-CERT","ipAddress":"10.8.0.99","realIpAddress":"181.91.85.248","bytesReceived":0,"bytesSent":0}' \
        "http://localhost:3000/api/vpn/connections" 2>/dev/null || echo "000")
    
    if [ "$HTTP_CODE" = "201" ] || [ "$HTTP_CODE" = "200" ]; then
        echo "  ✓ Registro exitoso (HTTP $HTTP_CODE)"
    else
        echo "  ✗ Registro falló (HTTP $HTTP_CODE)"
        echo "  Respuesta:"
        curl -s -X POST \
            -H "Content-Type: application/json" \
            -H "X-API-Token: $TOKEN_ENV" \
            -d '{"certificateName":"TEST-CERT","ipAddress":"10.8.0.99","realIpAddress":"181.91.85.248","bytesReceived":0,"bytesSent":0}' \
            "http://localhost:3000/api/vpn/connections" 2>/dev/null | sed 's/^/    /'
    fi
else
    echo "  ⚠ No se puede probar (token no encontrado)"
fi
echo ""

echo "=========================================="
echo "VERIFICACIÓN COMPLETADA"
echo "=========================================="
echo ""
echo "Si el token no funciona:"
echo "  1. Verifica que VPN_API_TOKEN en .env sea correcto"
echo "  2. Sincroniza override.conf con el token de .env"
echo "  3. Reinicia OpenVPN: sudo systemctl restart openvpn@server"
echo ""


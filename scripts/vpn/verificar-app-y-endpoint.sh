#!/bin/bash

# Script para verificar que la aplicación y el endpoint funcionan
# Ejecutar como root: sudo bash scripts/vpn/verificar-app-y-endpoint.sh

echo "=========================================="
echo "VERIFICACIÓN DE APLICACIÓN Y ENDPOINT"
echo "=========================================="
echo ""

echo "1. Verificar que PM2 está corriendo:"
echo "-------------------------------------"
pm2 status
echo ""

echo "2. Verificar que el puerto 3000 está escuchando:"
echo "-------------------------------------------------"
ss -tlnp | grep ":3000" || echo "  ✗ Puerto 3000 NO está escuchando"
echo ""

echo "3. Probar acceso a localhost:3000:"
echo "-----------------------------------"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/debug-ip 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "401" ] || [ "$HTTP_CODE" = "403" ]; then
    echo "✓ localhost:3000 responde (HTTP $HTTP_CODE)"
    echo "  Respuesta:"
    curl -s http://localhost:3000/api/debug-ip 2>/dev/null | head -3 | sed 's/^/    /'
else
    echo "✗ localhost:3000 NO responde (HTTP $HTTP_CODE)"
    echo "  Verificando logs de PM2:"
    pm2 logs axeso --lines 10 --nostream 2>/dev/null | tail -10 | sed 's/^/    /' || echo "    (no se pudieron obtener logs)"
fi
echo ""

echo "4. Probar endpoint de conexiones VPN:"
echo "-------------------------------------"
ENV_FILE="/home/cyberpol/web/visitantes.cyberpol.com.py/public_html/.env"
if [ -f "$ENV_FILE" ] && grep -q "VPN_API_TOKEN" "$ENV_FILE"; then
    TOKEN=$(grep "^VPN_API_TOKEN=" "$ENV_FILE" | cut -d'=' -f2 | tr -d '"' | tr -d "'" | tr -d ' ' | head -1)
    if [ -n "$TOKEN" ]; then
        echo "  Probando con token..."
        HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
            -H "x-api-token: $TOKEN" \
            "http://localhost:3000/api/vpn/connections?check=true&realIp=181.91.85.248" 2>/dev/null || echo "000")
        
        if [ "$HTTP_CODE" = "200" ]; then
            echo "  ✓ Endpoint responde (HTTP 200)"
            echo "  Respuesta:"
            curl -s -H "x-api-token: $TOKEN" \
                "http://localhost:3000/api/vpn/connections?check=true&realIp=181.91.85.248" 2>/dev/null | sed 's/^/    /'
        else
            echo "  ✗ Endpoint NO responde (HTTP $HTTP_CODE)"
            echo "  Respuesta completa:"
            curl -s -H "x-api-token: $TOKEN" \
                "http://localhost:3000/api/vpn/connections?check=true&realIp=181.91.85.248" 2>/dev/null | sed 's/^/    /' || echo "    (error de conexión)"
        fi
    else
        echo "  ⚠ Token vacío"
    fi
else
    echo "  ⚠ No se pudo obtener token"
fi
echo ""

echo "5. Verificar procesos Node.js:"
echo "------------------------------"
ps aux | grep -E "node|next" | grep -v grep | head -5 | sed 's/^/  /' || echo "  (no se encontraron procesos)"
echo ""

echo "6. Verificar logs de PM2 (últimas 20 líneas):"
echo "---------------------------------------------"
pm2 logs axeso --lines 20 --nostream 2>/dev/null | tail -20 | sed 's/^/  /' || echo "  (no se pudieron obtener logs)"
echo ""

echo "=========================================="
echo "VERIFICACIÓN COMPLETADA"
echo "=========================================="
echo ""
echo "Si la aplicación no responde:"
echo "  1. Reinicia PM2: pm2 restart axeso"
echo "  2. Verifica logs: pm2 logs axeso"
echo "  3. Verifica que el puerto 3000 esté libre"
echo ""


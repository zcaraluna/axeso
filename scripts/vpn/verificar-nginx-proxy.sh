#!/bin/bash

# Script para verificar configuración de Nginx
# Ejecutar como root: sudo bash scripts/vpn/verificar-nginx-proxy.sh

echo "=========================================="
echo "VERIFICACIÓN DE NGINX PROXY"
echo "=========================================="
echo ""

NGINX_CONF="/home/cyberpol/conf/web/visitantes.cyberpol.com.py/nginx.ssl.conf"

echo "1. Verificar proxy_pass en configuración:"
echo "-------------------------------------------"
grep -A 5 "proxy_pass" "$NGINX_CONF" | head -10
echo ""

echo "2. Probar proxy desde Nginx:"
echo "----------------------------"
curl -s -H "Host: visitantes.cyberpol.com.py" http://localhost/api/debug-ip 2>&1 | head -10
echo ""

echo "3. Probar directamente a Next.js:"
echo "--------------------------------"
curl -s http://localhost:3000/api/debug-ip | head -5
echo ""

echo "4. Ver logs de error de Nginx:"
echo "------------------------------"
tail -10 /var/log/apache2/domains/visitantes.cyberpol.com.py.error.log 2>/dev/null || echo "  No se encontraron logs de error"
echo ""

echo "5. Verificar sintaxis de Nginx:"
echo "--------------------------------"
nginx -t 2>&1
echo ""

echo "6. Verificar que Nginx puede resolver localhost:"
echo "------------------------------------------------"
getent hosts localhost || echo "  No puede resolver localhost"
echo ""

echo "=========================================="
echo "VERIFICACIÓN COMPLETADA"
echo "=========================================="


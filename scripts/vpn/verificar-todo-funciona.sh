#!/bin/bash

# Script para verificar que todo funciona después de la corrección
# Ejecutar como root: sudo bash scripts/vpn/verificar-todo-funciona.sh

echo "=========================================="
echo "VERIFICACIÓN FINAL"
echo "=========================================="
echo ""

echo "1. Estado de PM2:"
echo "-----------------"
pm2 status
echo ""

echo "2. Puerto 3000 escuchando:"
echo "--------------------------"
ss -tlnp | grep ":3000" || echo "  ⚠ Puerto 3000 no detectado con ss"
echo ""

echo "3. Proceso Next.js:"
echo "-------------------"
ps aux | grep -E "next-server|node.*3000" | grep -v grep || echo "  ⚠ No se encontró proceso Next.js"
echo ""

echo "4. Probando localhost:3000:"
echo "---------------------------"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/debug-ip 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "401" ] || [ "$HTTP_CODE" = "403" ]; then
    echo "✓ localhost:3000 responde (HTTP $HTTP_CODE)"
    echo ""
    echo "Respuesta completa:"
    curl -s http://localhost:3000/api/debug-ip | head -5
else
    echo "✗ localhost:3000 NO responde (HTTP $HTTP_CODE)"
    echo ""
    echo "Revisando logs de PM2:"
    pm2 logs axeso --lines 10 --nostream
fi
echo ""

echo "5. Verificando proxy_pass en Nginx:"
echo "-----------------------------------"
NGINX_CONF="/home/cyberpol/conf/web/visitantes.cyberpol.com.py/nginx.ssl.conf"
if grep -q "proxy_pass.*localhost:3000" "$NGINX_CONF"; then
    echo "✓ proxy_pass está configurado correctamente (localhost:3000)"
    grep "proxy_pass" "$NGINX_CONF" | head -3
else
    echo "✗ ERROR: proxy_pass NO está configurado correctamente"
    grep "proxy_pass" "$NGINX_CONF" | head -3
fi
echo ""

echo "6. Probando a través de Nginx (simulando dominio):"
echo "---------------------------------------------------"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -k -H "Host: visitantes.cyberpol.com.py" https://144.202.77.18/api/debug-ip 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "401" ] || [ "$HTTP_CODE" = "403" ]; then
    echo "✓ Nginx responde correctamente (HTTP $HTTP_CODE)"
else
    echo "✗ Nginx NO responde (HTTP $HTTP_CODE)"
    echo ""
    echo "Últimos errores de Nginx:"
    tail -5 /var/log/apache2/domains/visitantes.cyberpol.com.py.error.log 2>/dev/null || tail -5 /var/log/nginx/error.log 2>/dev/null || echo "  No se encontraron logs"
fi
echo ""

echo "=========================================="
echo "VERIFICACIÓN COMPLETADA"
echo "=========================================="
echo ""
echo "Si todo está correcto, prueba acceder desde tu navegador:"
echo "  https://visitantes.cyberpol.com.py"
echo ""


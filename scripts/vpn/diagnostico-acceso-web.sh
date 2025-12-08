#!/bin/bash

# Script para diagnosticar problemas de acceso web
# Ejecutar como root: sudo bash scripts/vpn/diagnostico-acceso-web.sh

echo "=========================================="
echo "DIAGNÓSTICO DE ACCESO WEB"
echo "=========================================="
echo ""

echo "1. Estado de Nginx:"
echo "-------------------"
systemctl status nginx --no-pager | head -15
echo ""

echo "2. Estado de PM2 (Next.js):"
echo "---------------------------"
pm2 status
echo ""

echo "3. Probar Next.js directamente:"
echo "-------------------------------"
curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" http://localhost:3000/api/debug-ip || echo "  ✗ No responde"
echo ""

echo "4. Probar a través de Nginx (simulando el dominio):"
echo "---------------------------------------------------"
curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" -H "Host: visitantes.cyberpol.com.py" http://localhost/api/debug-ip || echo "  ✗ No responde"
echo ""

echo "5. Ver logs de error de Nginx:"
echo "------------------------------"
tail -20 /var/log/apache2/domains/visitantes.cyberpol.com.py.error.log 2>/dev/null | tail -10 || echo "  No se encontraron logs de error"
echo ""

echo "6. Verificar configuración de proxy_pass:"
echo "----------------------------------------"
grep "proxy_pass" /home/cyberpol/conf/web/visitantes.cyberpol.com.py/nginx.ssl.conf | head -3
echo ""

echo "7. Verificar que Nginx está escuchando en puerto 443:"
echo "-----------------------------------------------------"
ss -tlnp | grep 443 | head -3
echo ""

echo "8. Probar sintaxis de Nginx:"
echo "----------------------------"
nginx -t 2>&1
echo ""

echo "9. Ver logs recientes de Nginx:"
echo "-------------------------------"
tail -10 /var/log/apache2/domains/visitantes.cyberpol.com.py.log 2>/dev/null | tail -5 || echo "  No se encontraron logs"
echo ""

echo "=========================================="
echo "DIAGNÓSTICO COMPLETADO"
echo "=========================================="


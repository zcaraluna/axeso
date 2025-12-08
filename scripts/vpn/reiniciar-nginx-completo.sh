#!/bin/bash

# Script para reiniciar Nginx completamente y verificar configuración
# Ejecutar como root: sudo bash scripts/vpn/reiniciar-nginx-completo.sh

set -e

echo "=========================================="
echo "REINICIO COMPLETO DE NGINX"
echo "=========================================="
echo ""

echo "1. Verificar configuración antes de reiniciar:"
echo "-----------------------------------------------"
grep "proxy_pass" /home/cyberpol/conf/web/visitantes.cyberpol.com.py/nginx.ssl.conf | head -3
echo ""

echo "2. Verificar sintaxis:"
echo "----------------------"
nginx -t
echo ""

echo "3. Detener Nginx completamente:"
echo "-------------------------------"
systemctl stop nginx
sleep 2
echo "✓ Nginx detenido"
echo ""

echo "4. Verificar que no hay procesos de Nginx:"
echo "------------------------------------------"
ps aux | grep nginx | grep -v grep || echo "  ✓ No hay procesos de Nginx"
echo ""

echo "5. Iniciar Nginx:"
echo "-----------------"
systemctl start nginx
sleep 2
echo "✓ Nginx iniciado"
echo ""

echo "6. Verificar estado:"
echo "--------------------"
systemctl status nginx --no-pager | head -10
echo ""

echo "7. Verificar que está escuchando en puertos 80 y 443:"
echo "-----------------------------------------------------"
ss -tlnp | grep -E ":80 |:443 " | head -5
echo ""

echo "8. Probar acceso local:"
echo "----------------------"
timeout 3 curl -s -H "Host: visitantes.cyberpol.com.py" http://localhost/api/debug-ip | head -3 || echo "  ✗ No responde"
echo ""

echo "=========================================="
echo "REINICIO COMPLETADO"
echo "=========================================="
echo ""
echo "Ahora prueba acceder desde el navegador:"
echo "  https://visitantes.cyberpol.com.py"
echo ""


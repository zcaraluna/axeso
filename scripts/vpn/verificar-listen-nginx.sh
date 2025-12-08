#!/bin/bash

# Script para verificar configuración de listen en Nginx
# Ejecutar como root: sudo bash scripts/vpn/verificar-listen-nginx.sh

echo "=========================================="
echo "VERIFICACIÓN DE LISTEN EN NGINX"
echo "=========================================="
echo ""

echo "1. Configuración de listen en archivo principal:"
echo "-------------------------------------------------"
grep -E "listen|server_name" /etc/nginx/conf.d/domains/visitantes.cyberpol.com.py.conf 2>/dev/null | head -10
echo ""

echo "2. Configuración de listen en nginx.ssl.conf:"
echo "----------------------------------------------"
grep "listen" /home/cyberpol/conf/web/visitantes.cyberpol.com.py/nginx.ssl.conf | head -5
echo ""

echo "3. Verificar configuración completa de Nginx (T output):"
echo "--------------------------------------------------------"
nginx -T 2>&1 | grep -A 10 "visitantes.cyberpol.com.py" | grep -E "listen|server_name" | head -10
echo ""

echo "4. Verificar si hay conflictos de puertos:"
echo "-------------------------------------------"
ss -tlnp | grep -E ":80 |:443 " | head -10
echo ""

echo "5. Verificar procesos escuchando en todas las interfaces:"
echo "--------------------------------------------------------"
ss -tlnp | grep -E "0.0.0.0:|:::" | head -10
echo ""

echo "6. Probar acceso directo a Next.js por IP externa:"
echo "------------------------------------------------"
curl -s http://144.202.77.18:3000/api/debug-ip | head -3
echo ""

echo "7. Verificar logs de Nginx cuando intentas acceder:"
echo "---------------------------------------------------"
echo "  (Ejecuta esto en otra terminal mientras intentas acceder desde el navegador)"
echo "  sudo tail -f /var/log/apache2/domains/visitantes.cyberpol.com.py.error.log"
echo ""

echo "=========================================="
echo "VERIFICACIÓN COMPLETADA"
echo "=========================================="


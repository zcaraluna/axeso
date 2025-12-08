#!/bin/bash

# Script para diagnóstico completo de Nginx
# Ejecutar como root: sudo bash scripts/vpn/diagnostico-nginx-completo.sh

echo "=========================================="
echo "DIAGNÓSTICO COMPLETO DE NGINX"
echo "=========================================="
echo ""

echo "1. Estado de Nginx:"
echo "-------------------"
systemctl status nginx --no-pager | head -15
echo ""

echo "2. Procesos de Nginx:"
echo "---------------------"
ps aux | grep nginx | grep -v grep
echo ""

echo "3. Puertos escuchando (todas las interfaces):"
echo "----------------------------------------------"
ss -tlnp | grep -E "nginx|:80|:443" | head -10
echo ""

echo "4. Probar acceso HTTP local:"
echo "----------------------------"
curl -v -H "Host: visitantes.cyberpol.com.py" http://127.0.0.1/ 2>&1 | head -15
echo ""

echo "5. Probar acceso HTTPS local:"
echo "-----------------------------"
curl -v -k -H "Host: visitantes.cyberpol.com.py" https://127.0.0.1/ 2>&1 | head -15
echo ""

echo "6. Probar acceso por IP externa (HTTP):"
echo "---------------------------------------"
curl -v -H "Host: visitantes.cyberpol.com.py" http://144.202.77.18/ 2>&1 | head -15
echo ""

echo "7. Probar acceso por IP externa (HTTPS):"
echo "-----------------------------------------"
curl -v -k -H "Host: visitantes.cyberpol.com.py" https://144.202.77.18/ 2>&1 | head -15
echo ""

echo "8. Ver logs de error recientes:"
echo "-------------------------------"
tail -20 /var/log/apache2/domains/visitantes.cyberpol.com.py.error.log 2>/dev/null | tail -10
echo ""

echo "9. Ver logs de acceso recientes:"
echo "--------------------------------"
tail -10 /var/log/apache2/domains/visitantes.cyberpol.com.py.log 2>/dev/null | tail -5
echo ""

echo "10. Verificar configuración activa de proxy_pass:"
echo "--------------------------------------------------"
nginx -T 2>&1 | grep -A 5 "visitantes.cyberpol.com.py" | grep -A 3 "proxy_pass" | head -10
echo ""

echo "=========================================="
echo "DIAGNÓSTICO COMPLETADO"
echo "=========================================="


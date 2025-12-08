#!/bin/bash

# Script para verificar por qué Nginx no está escuchando en los puertos
# Ejecutar como root: sudo bash scripts/vpn/verificar-puertos-nginx.sh

echo "=========================================="
echo "VERIFICACIÓN DE PUERTOS NGINX"
echo "=========================================="
echo ""

echo "1. Todos los puertos TCP escuchando:"
echo "------------------------------------"
ss -tlnp | head -20
echo ""

echo "2. Buscar específicamente puertos 80 y 443:"
echo "-------------------------------------------"
ss -tlnp | grep -E ":80 |:443 "
echo ""

echo "3. Verificar configuración de listen en Nginx:"
echo "----------------------------------------------"
nginx -T 2>&1 | grep -E "listen.*80|listen.*443" | grep -v "^#" | head -10
echo ""

echo "4. Verificar archivo principal de configuración:"
echo "------------------------------------------------"
grep -E "listen|server_name" /etc/nginx/conf.d/domains/visitantes.cyberpol.com.py.conf 2>/dev/null | head -10
echo ""

echo "5. Verificar procesos de Nginx:"
echo "-------------------------------"
ps aux | grep nginx | grep -v grep
echo ""

echo "6. Verificar logs de error de Nginx:"
echo "-------------------------------------"
journalctl -u nginx -n 20 --no-pager | tail -10
echo ""

echo "7. Probar si Nginx responde en puerto 80:"
echo "-----------------------------------------"
timeout 2 curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" http://localhost/ 2>&1 || echo "  No responde"
echo ""

echo "8. Probar si Nginx responde en puerto 443:"
echo "------------------------------------------"
timeout 2 curl -s -k -o /dev/null -w "HTTP Status: %{http_code}\n" https://localhost/ 2>&1 || echo "  No responde"
echo ""

echo "=========================================="
echo "VERIFICACIÓN COMPLETADA"
echo "=========================================="


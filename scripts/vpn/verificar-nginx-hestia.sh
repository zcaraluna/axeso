#!/bin/bash

# Script para verificar qué instancia de Nginx está sirviendo
# Ejecutar como root: sudo bash scripts/vpn/verificar-nginx-hestia.sh

echo "=========================================="
echo "VERIFICACIÓN DE NGINX Y HESTIA"
echo "=========================================="
echo ""

echo "1. Procesos de Nginx:"
echo "---------------------"
ps aux | grep nginx | grep -v grep
echo ""

echo "2. Verificar qué puertos está usando cada instancia:"
echo "----------------------------------------------------"
echo "Nginx del sistema:"
ss -tlnp | grep "nginx" | grep -v "hestia"
echo ""
echo "Nginx de Hestia:"
ss -tlnp | grep "hestia-nginx"
echo ""

echo "3. Verificar configuración de Hestia:"
echo "-------------------------------------"
if [ -f "/usr/local/hestia/nginx/conf/nginx.conf" ]; then
    echo "Archivo de configuración de Hestia encontrado"
    grep -A 5 "visitantes.cyberpol.com.py" /usr/local/hestia/nginx/conf/nginx.conf 2>/dev/null | head -10 || echo "  No se encontró el dominio en la configuración de Hestia"
else
    echo "  No se encontró configuración de Hestia"
fi
echo ""

echo "4. Verificar archivos de configuración de Hestia:"
echo "------------------------------------------------"
find /usr/local/hestia -name "*visitantes*" -type f 2>/dev/null | head -10
echo ""

echo "5. Probar acceso HTTPS por IP (debería funcionar):"
echo "--------------------------------------------------"
timeout 5 curl -s -k -H "Host: visitantes.cyberpol.com.py" https://144.202.77.18/api/debug-ip 2>&1 | head -10
echo ""

echo "6. Ver logs de Hestia Nginx:"
echo "----------------------------"
tail -10 /var/log/hestia/nginx-error.log 2>/dev/null | tail -5 || echo "  No se encontraron logs de Hestia"
echo ""

echo "=========================================="
echo "VERIFICACIÓN COMPLETADA"
echo "=========================================="
echo ""
echo "Si Hestia está usando su propia configuración, puede que necesites:"
echo "  1. Actualizar la configuración en el panel de Hestia"
echo "  2. O verificar qué archivo de configuración está usando realmente"
echo ""


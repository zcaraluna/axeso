#!/bin/bash

# Script para verificar archivos incluidos en Nginx
# Ejecutar como root: sudo bash scripts/vpn/verificar-includes-nginx.sh

set -e

CONF_DIR="/home/cyberpol/conf/web/visitantes.cyberpol.com.py"

echo "=========================================="
echo "VERIFICACIÓN DE ARCHIVOS INCLUIDOS NGINX"
echo "=========================================="
echo ""

echo "1. Archivos en el directorio de configuración:"
echo "----------------------------------------------"
ls -la "$CONF_DIR"/*.conf* 2>/dev/null | head -20
echo ""

echo "2. Buscar archivos nginx.conf_*:"
echo "--------------------------------"
find "$CONF_DIR" -name "nginx.conf_*" -type f 2>/dev/null
echo ""

echo "3. Buscar referencias a IP externa en todos los archivos:"
echo "----------------------------------------------------------"
grep -r "144.202.77.18:3000" "$CONF_DIR" 2>/dev/null | grep -v ".backup" | head -10
echo ""

echo "4. Verificar archivo principal usado por Nginx:"
echo "-----------------------------------------------"
MAIN_CONF="/etc/nginx/conf.d/domains/visitantes.cyberpol.com.py.conf"
if [ -f "$MAIN_CONF" ]; then
    echo "Archivo principal: $MAIN_CONF"
    echo "Incluye:"
    grep "include.*visitantes" "$MAIN_CONF" | head -10
    echo ""
    
    echo "proxy_pass en archivo principal:"
    grep -A 2 "proxy_pass" "$MAIN_CONF" | head -10
else
    echo "  Archivo principal no encontrado"
fi
echo ""

echo "5. Verificar configuración activa de proxy_pass:"
echo "------------------------------------------------"
nginx -T 2>&1 | grep -A 3 "visitantes.cyberpol.com.py" | grep -A 3 "proxy_pass" | head -15
echo ""

echo "=========================================="
echo "VERIFICACIÓN COMPLETADA"
echo "=========================================="


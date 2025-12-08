#!/bin/bash

# Script para corregir proxy_pass en Nginx a localhost
# Ejecutar como root: sudo bash scripts/vpn/fix-nginx-proxy-localhost.sh

set -e

NGINX_CONF="/home/cyberpol/conf/web/visitantes.cyberpol.com.py/nginx.ssl.conf"

echo "=========================================="
echo "CORRECCIÓN DE PROXY_PASS EN NGINX"
echo "=========================================="
echo ""

# Hacer backup
BACKUP_FILE="${NGINX_CONF}.backup.$(date +%Y%m%d_%H%M%S)"
cp "$NGINX_CONF" "$BACKUP_FILE"
echo "Backup creado: $BACKUP_FILE"
echo ""

# Reemplazar proxy_pass de IP externa a localhost
echo "Corrigiendo proxy_pass..."
sed -i 's|proxy_pass http://144.202.77.18:3000;|proxy_pass http://localhost:3000;|g' "$NGINX_CONF"

echo "✓ proxy_pass corregido a localhost:3000"
echo ""

# Verificar cambios
echo "Verificando cambios:"
grep "proxy_pass" "$NGINX_CONF" | head -5
echo ""

# Verificar sintaxis de Nginx
echo "Verificando sintaxis de Nginx..."
if nginx -t 2>&1 | grep -q "successful"; then
    echo "✓ Sintaxis correcta"
    echo ""
    echo "Recargando Nginx..."
    systemctl reload nginx
    echo "✓ Nginx recargado"
else
    echo "✗ Error en sintaxis:"
    nginx -t
    echo ""
    echo "Restaurando backup..."
    cp "$BACKUP_FILE" "$NGINX_CONF"
    exit 1
fi

echo ""
echo "=========================================="
echo "CORRECCIÓN COMPLETADA"
echo "=========================================="
echo ""
echo "Ahora prueba acceder desde el navegador:"
echo "  https://visitantes.cyberpol.com.py"
echo ""


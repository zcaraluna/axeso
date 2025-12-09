#!/bin/bash

# Script para corregir proxy_pass en Nginx INMEDIATAMENTE
# Ejecutar como root: sudo bash scripts/vpn/corregir-nginx-ahora.sh

set -e

NGINX_CONF="/home/cyberpol/conf/web/visitantes.cyberpol.com.py/nginx.ssl.conf"

echo "=========================================="
echo "CORRECCIÓN INMEDIATA DE NGINX"
echo "=========================================="
echo ""

if [ ! -f "$NGINX_CONF" ]; then
    echo "ERROR: No se encontró $NGINX_CONF"
    exit 1
fi

# Hacer backup
BACKUP_FILE="${NGINX_CONF}.backup.$(date +%Y%m%d_%H%M%S)"
cp "$NGINX_CONF" "$BACKUP_FILE"
echo "✓ Backup creado: $BACKUP_FILE"
echo ""

# Reemplazar TODAS las referencias a la IP externa
echo "Corrigiendo proxy_pass..."
sed -i 's|http://144.202.77.18:3000|http://localhost:3000|g' "$NGINX_CONF"
sed -i 's|144.202.77.18:3000|localhost:3000|g' "$NGINX_CONF"

echo "✓ proxy_pass corregido"
echo ""

# Verificar cambios
echo "Verificando cambios:"
grep "proxy_pass" "$NGINX_CONF" | head -5
echo ""

# Verificar sintaxis de Nginx
echo "Verificando sintaxis..."
if nginx -t 2>&1 | grep -q "successful"; then
    echo "✓ Sintaxis correcta"
    echo ""
    
    # Recargar Nginx
    echo "Recargando Nginx..."
    systemctl reload nginx || systemctl restart nginx
    echo "✓ Nginx recargado"
    echo ""
    
    # Verificar que Nginx está corriendo
    if systemctl is-active --quiet nginx; then
        echo "✓ Nginx está corriendo"
    else
        echo "✗ ERROR: Nginx no está corriendo"
        exit 1
    fi
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
echo "Prueba acceder ahora:"
echo "  https://visitantes.cyberpol.com.py"
echo ""


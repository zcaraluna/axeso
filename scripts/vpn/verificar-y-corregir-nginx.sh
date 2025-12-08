#!/bin/bash

# Script para verificar y corregir configuración de Nginx
# Ejecutar como root: sudo bash scripts/vpn/verificar-y-corregir-nginx.sh

set -e

NGINX_CONF="/home/cyberpol/conf/web/visitantes.cyberpol.com.py/nginx.ssl.conf"

echo "=========================================="
echo "VERIFICACIÓN Y CORRECCIÓN DE NGINX"
echo "=========================================="
echo ""

echo "1. Verificar configuración actual:"
echo "-----------------------------------"
grep -n "proxy_pass" "$NGINX_CONF" | head -10
echo ""

# Verificar si hay referencias a la IP externa
if grep -q "144.202.77.18:3000" "$NGINX_CONF"; then
    echo "⚠ Aún hay referencias a 144.202.77.18:3000"
    echo ""
    echo "2. Corrigiendo todas las referencias..."
    echo "----------------------------------------"
    
    # Hacer backup
    BACKUP_FILE="${NGINX_CONF}.backup.$(date +%Y%m%d_%H%M%S)"
    cp "$NGINX_CONF" "$BACKUP_FILE"
    echo "Backup creado: $BACKUP_FILE"
    echo ""
    
    # Reemplazar todas las ocurrencias
    sed -i 's|http://144.202.77.18:3000|http://localhost:3000|g' "$NGINX_CONF"
    sed -i 's|144.202.77.18:3000|localhost:3000|g' "$NGINX_CONF"
    
    echo "✓ Referencias corregidas"
    echo ""
    
    echo "3. Verificar cambios:"
    echo "---------------------"
    grep -n "proxy_pass" "$NGINX_CONF" | head -10
    echo ""
else
    echo "✓ No hay referencias a 144.202.77.18:3000"
    echo ""
fi

# Verificar sintaxis
echo "4. Verificar sintaxis de Nginx:"
echo "--------------------------------"
if nginx -t 2>&1 | grep -q "successful"; then
    echo "✓ Sintaxis correcta"
    echo ""
    echo "5. Recargando Nginx..."
    echo "----------------------"
    systemctl reload nginx
    sleep 2
    echo "✓ Nginx recargado"
    echo ""
    
    echo "6. Verificar que está funcionando:"
    echo "-----------------------------------"
    curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" -H "Host: visitantes.cyberpol.com.py" http://localhost/api/debug-ip || echo "  ✗ No responde"
else
    echo "✗ Error en sintaxis:"
    nginx -t
    exit 1
fi

echo ""
echo "=========================================="
echo "VERIFICACIÓN COMPLETADA"
echo "=========================================="


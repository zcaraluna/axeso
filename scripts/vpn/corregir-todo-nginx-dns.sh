#!/bin/bash

# Script para corregir proxy_pass Y verificar DNS/resolv.conf
# Ejecutar como root: sudo bash scripts/vpn/corregir-todo-nginx-dns.sh

set -e

NGINX_CONF="/home/cyberpol/conf/web/visitantes.cyberpol.com.py/nginx.ssl.conf"

echo "=========================================="
echo "CORRECCIÓN COMPLETA: NGINX + DNS"
echo "=========================================="
echo ""

# 1. Verificar y corregir proxy_pass
echo "1. CORRIGIENDO PROXY_PASS..."
echo "----------------------------"
if [ ! -f "$NGINX_CONF" ]; then
    echo "ERROR: No se encontró $NGINX_CONF"
    exit 1
fi

# Hacer backup
BACKUP_FILE="${NGINX_CONF}.backup.$(date +%Y%m%d_%H%M%S)"
cp "$NGINX_CONF" "$BACKUP_FILE"
echo "✓ Backup creado: $BACKUP_FILE"

# Reemplazar TODAS las referencias a la IP externa
sed -i 's|http://144.202.77.18:3000|http://localhost:3000|g' "$NGINX_CONF"
sed -i 's|144.202.77.18:3000|localhost:3000|g' "$NGINX_CONF"
echo "✓ proxy_pass corregido a localhost:3000"
echo ""

# 2. Verificar resolv.conf y systemd-resolved
echo "2. VERIFICANDO DNS/RESOLV.CONF..."
echo "---------------------------------"
echo "Estado de systemd-resolved:"
systemctl status systemd-resolved --no-pager | head -5 || echo "  systemd-resolved no está corriendo"
echo ""

echo "Resolvers activos:"
resolvectl status 2>/dev/null | grep -A 5 "DNS Servers" || echo "  No se pudo obtener estado"
echo ""

echo "Probando resolución de localhost:"
getent hosts localhost || echo "  Error resolviendo localhost"
echo ""

echo "Probando resolución de 127.0.0.1:"
getent hosts 127.0.0.1 || echo "  Error resolviendo 127.0.0.1"
echo ""

# 3. Verificar que Next.js está escuchando en localhost
echo "3. VERIFICANDO QUE NEXT.JS ESTÁ ESCUCHANDO..."
echo "----------------------------------------------"
if ss -tlnp | grep -q ":3000"; then
    echo "✓ Puerto 3000 está escuchando:"
    ss -tlnp | grep ":3000"
else
    echo "✗ ERROR: Puerto 3000 NO está escuchando"
    echo "  Verifica que PM2 esté corriendo: pm2 status"
fi
echo ""

# 4. Verificar sintaxis de Nginx
echo "4. VERIFICANDO SINTAXIS DE NGINX..."
echo "-----------------------------------"
if nginx -t 2>&1 | grep -q "successful"; then
    echo "✓ Sintaxis correcta"
    echo ""
    
    # Recargar Nginx
    echo "5. RECARGANDO NGINX..."
    echo "----------------------"
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
echo "6. PROBANDO CONECTIVIDAD..."
echo "--------------------------"
echo "Probando localhost:3000 desde el servidor:"
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/debug-ip | grep -q "200\|401\|403"; then
    echo "✓ localhost:3000 responde correctamente"
else
    echo "✗ localhost:3000 NO responde"
    echo "  Verifica: pm2 logs axeso"
fi
echo ""

echo "=========================================="
echo "CORRECCIÓN COMPLETADA"
echo "=========================================="
echo ""
echo "Cambios realizados:"
echo "  ✓ proxy_pass cambiado de 144.202.77.18:3000 a localhost:3000"
echo "  ✓ Nginx recargado"
echo ""
echo "Prueba acceder ahora:"
echo "  https://visitantes.cyberpol.com.py"
echo ""


#!/bin/bash

# Script para corregir problemas de acceso web
# Ejecutar como root: sudo bash scripts/corregir-acceso-web.sh

set -e

DOMAIN="visitantes.cyberpol.com.py"
IP="144.202.77.18"
NGINX_CONF="/home/cyberpol/conf/web/$DOMAIN/nginx.ssl.conf"

echo "=========================================="
echo "CORRECCIÓN DE ACCESO WEB"
echo "=========================================="
echo ""

# Verificar que el archivo existe
if [ ! -f "$NGINX_CONF" ]; then
    echo "✗ Error: No se encontró $NGINX_CONF"
    exit 1
fi

echo "1. Creando backup de configuración:"
echo "------------------------------------"
BACKUP_FILE="${NGINX_CONF}.backup.$(date +%Y%m%d_%H%M%S)"
cp "$NGINX_CONF" "$BACKUP_FILE"
echo "  ✓ Backup creado: $BACKUP_FILE"
echo ""

echo "2. Corrigiendo configuración de listen:"
echo "----------------------------------------"
# Cambiar listen de IP específica a todas las interfaces
if grep -q "listen.*$IP:443" "$NGINX_CONF"; then
    sed -i "s|listen.*$IP:443 ssl|listen 443 ssl|g" "$NGINX_CONF"
    sed -i "s|listen.*$IP:443|listen 443 ssl|g" "$NGINX_CONF"
    echo "  ✓ Cambiado listen de $IP:443 a 443 (todas las interfaces)"
else
    echo "  ✓ Ya está configurado para escuchar en todas las interfaces"
fi
echo ""

echo "3. Corrigiendo TODAS las referencias a proxy_pass con IP externa:"
echo "------------------------------------------------------------------"
# Buscar y reemplazar todas las referencias a la IP externa en proxy_pass
CHANGED=0
if grep -q "proxy_pass.*$IP:3000\|http://$IP:3000\|$IP:3000" "$NGINX_CONF"; then
    sed -i "s|proxy_pass http://$IP:3000|proxy_pass http://localhost:3000|g" "$NGINX_CONF"
    sed -i "s|http://$IP:3000|http://localhost:3000|g" "$NGINX_CONF"
    sed -i "s|$IP:3000|localhost:3000|g" "$NGINX_CONF"
    CHANGED=1
    echo "  ✓ Cambiado proxy_pass de $IP:3000 a localhost:3000"
else
    echo "  ✓ Ya está configurado para usar localhost"
fi
echo ""

echo "4. Verificando cambios:"
echo "-----------------------"
echo "Listen:"
grep "listen" "$NGINX_CONF" | head -2
echo ""
echo "Proxy_pass:"
grep "proxy_pass" "$NGINX_CONF" | head -3
echo ""

echo "5. Verificando sintaxis de Nginx:"
echo "----------------------------------"
if nginx -t 2>&1 | grep -q "successful"; then
    echo "  ✓ Sintaxis correcta"
    echo ""
    echo "6. Recargando Nginx:"
    echo "--------------------"
    systemctl reload nginx
    echo "  ✓ Nginx recargado"
else
    echo "  ✗ Error en sintaxis:"
    nginx -t
    echo ""
    echo "Restaurando backup..."
    cp "$BACKUP_FILE" "$NGINX_CONF"
    exit 1
fi
echo ""

echo "7. Verificando que Nginx está escuchando:"
echo "------------------------------------------"
ss -tlnp | grep nginx | grep -E ":80|:443" | head -3
echo ""

echo "8. Verificando que Next.js está respondiendo:"
echo "----------------------------------------------"
if timeout 3 curl -s http://localhost:3000/api/debug-ip > /dev/null 2>&1; then
    echo "  ✓ Next.js está respondiendo"
else
    echo "  ⚠ Next.js no está respondiendo en localhost:3000"
    echo "     Verifica que PM2 esté corriendo: pm2 status"
fi
echo ""

echo "=========================================="
echo "CORRECCIÓN COMPLETADA"
echo "=========================================="
echo ""
echo "PRÓXIMOS PASOS:"
echo ""
echo "1. Verificar DNS:"
echo "   - Ejecuta: bash scripts/diagnostico-dns-completo.sh"
echo "   - O verifica manualmente: dig $DOMAIN +short"
echo ""
echo "2. Si el DNS no resuelve desde servidores públicos:"
echo "   - Configura el registro A en tu proveedor de dominio"
echo "   - El registro debe ser: $DOMAIN -> $IP"
echo ""
echo "3. Si el DNS funciona pero aún no puedes acceder:"
echo "   - Verifica el firewall: sudo ufw status"
echo "   - Asegúrate de que el puerto 443 esté abierto"
echo ""
echo "4. Prueba acceder desde el navegador:"
echo "   - https://$DOMAIN"
echo "   - O temporalmente: https://$IP (debería funcionar)"
echo ""


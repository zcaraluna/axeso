#!/bin/bash

# Script para corregir DNS en Hestia y configuración de Nginx
# Ejecutar como root: sudo bash scripts/corregir-dns-y-nginx.sh

set -e

DOMAIN="visitantes.cyberpol.com.py"
IP="144.202.77.18"
NGINX_CONF="/home/cyberpol/conf/web/$DOMAIN/nginx.ssl.conf"
HESTIA_DNS_CONF="/usr/local/hestia/data/users/cyberpol/dns/$DOMAIN.conf"

echo "=========================================="
echo "CORRECCIÓN DE DNS Y NGINX"
echo "=========================================="
echo ""

# ============================================
# PARTE 1: Corregir Nginx
# ============================================
echo "PARTE 1: CORRECCIÓN DE NGINX"
echo "============================"
echo ""

if [ ! -f "$NGINX_CONF" ]; then
    echo "✗ Error: No se encontró $NGINX_CONF"
    exit 1
fi

echo "1. Creando backup de configuración Nginx:"
echo "------------------------------------------"
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
if grep -q "proxy_pass.*$IP:3000" "$NGINX_CONF"; then
    sed -i "s|proxy_pass http://$IP:3000|proxy_pass http://localhost:3000|g" "$NGINX_CONF"
    sed -i "s|http://$IP:3000|http://localhost:3000|g" "$NGINX_CONF"
    sed -i "s|$IP:3000|localhost:3000|g" "$NGINX_CONF"
    CHANGED=1
    echo "  ✓ Cambiado proxy_pass de $IP:3000 a localhost:3000"
else
    echo "  ✓ Ya está configurado para usar localhost"
fi
echo ""

echo "4. Verificando cambios en Nginx:"
echo "----------------------------------"
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

# ============================================
# PARTE 2: Verificar y Corregir DNS en Hestia
# ============================================
echo ""
echo "PARTE 2: VERIFICACIÓN Y CORRECCIÓN DE DNS"
echo "=========================================="
echo ""

echo "7. Verificando configuración DNS actual en Hestia:"
echo "---------------------------------------------------"
if [ -f "$HESTIA_DNS_CONF" ]; then
    echo "  ✓ Archivo DNS encontrado en Hestia"
    echo ""
    echo "  Registros actuales:"
    cat "$HESTIA_DNS_CONF" | grep -v "^#" | head -20
    echo ""
    
    # Verificar si existe registro A para visitantes
    if grep -q "^RECORD='@' TYPE='A'" "$HESTIA_DNS_CONF" || grep -q "VALUE='$IP'" "$HESTIA_DNS_CONF"; then
        echo "  ✓ Existe registro A apuntando a $IP"
    else
        echo "  ⚠ No se encontró registro A para el dominio raíz"
    fi
else
    echo "  ✗ No se encontró archivo de configuración DNS en Hestia"
    echo "    Ruta esperada: $HESTIA_DNS_CONF"
fi
echo ""

echo "8. Verificando si el dominio tiene zona DNS propia:"
echo "----------------------------------------------------"
# El problema es que visitantes.cyberpol.com.py es un subdominio
# Necesita un registro A en la zona de cyberpol.com.py o su propia zona

# Verificar si existe zona para cyberpol.com.py
CYBERPOL_DNS="/usr/local/hestia/data/users/cyberpol/dns/cyberpol.com.py.conf"
if [ -f "$CYBERPOL_DNS" ]; then
    echo "  ✓ Zona DNS encontrada para cyberpol.com.py"
    echo ""
    echo "  Verificando si existe registro para 'visitantes':"
    if grep -q "RECORD='visitantes'" "$CYBERPOL_DNS"; then
        echo "  ✓ Existe registro para 'visitantes'"
        grep "RECORD='visitantes'" "$CYBERPOL_DNS"
    else
        echo "  ✗ NO existe registro A para 'visitantes'"
        echo ""
        echo "  Para crear el registro DNS en Hestia CP:"
        echo "  1. Accede a Hestia CP: https://tu-servidor:8083"
        echo "  2. Ve a 'DNS' → 'DNS Domains'"
        echo "  3. Selecciona 'cyberpol.com.py'"
        echo "  4. Agrega un nuevo registro:"
        echo "     - Tipo: A"
        echo "     - Nombre: visitantes"
        echo "     - Valor: $IP"
        echo "  5. Guarda los cambios"
        echo ""
        echo "  O ejecuta desde Hestia CLI:"
        echo "  /usr/local/hestia/bin/v-add-dns-record cyberpol cyberpol.com.py visitantes A $IP"
    fi
else
    echo "  ✗ No se encontró zona DNS para cyberpol.com.py"
    echo "    Ruta esperada: $CYBERPOL_DNS"
fi
echo ""

echo "9. Verificando resolución DNS actual:"
echo "---------------------------------------"
RESOLVED_IP=$(dig +short $DOMAIN 2>/dev/null | tail -1)
if [ -z "$RESOLVED_IP" ]; then
    echo "  ✗ El dominio NO resuelve (no devuelve IP)"
elif [ "$RESOLVED_IP" = "$IP" ]; then
    echo "  ✓ DNS resuelve correctamente: $RESOLVED_IP"
else
    echo "  ✗ DNS resuelve a IP incorrecta: $RESOLVED_IP (esperado: $IP)"
fi
echo ""

# ============================================
# RESUMEN Y PRÓXIMOS PASOS
# ============================================
echo ""
echo "=========================================="
echo "CORRECCIÓN COMPLETADA"
echo "=========================================="
echo ""
echo "RESUMEN:"
echo "--------"
echo "✓ Nginx configurado para escuchar en todas las interfaces"
echo "✓ proxy_pass corregido a localhost:3000"
echo ""

if [ -z "$RESOLVED_IP" ] || [ "$RESOLVED_IP" != "$IP" ]; then
    echo "⚠ PROBLEMA DE DNS DETECTADO"
    echo ""
    echo "El dominio $DOMAIN no está resolviendo correctamente."
    echo ""
    echo "SOLUCIÓN:"
    echo "---------"
    echo "1. Accede a Hestia CP: https://$(hostname -I | awk '{print $1}'):8083"
    echo "2. Ve a 'DNS' → 'DNS Domains'"
    echo "3. Selecciona 'cyberpol.com.py'"
    echo "4. Agrega un nuevo registro A:"
    echo "   - Tipo: A"
    echo "   - Nombre: visitantes"
    echo "   - Valor: $IP"
    echo "   - TTL: 3600"
    echo "5. Guarda los cambios"
    echo ""
    echo "O desde la línea de comandos (si tienes acceso a Hestia CLI):"
    echo "  /usr/local/hestia/bin/v-add-dns-record cyberpol cyberpol.com.py visitantes A $IP"
    echo ""
    echo "Después de crear el registro, espera unos minutos y verifica:"
    echo "  dig $DOMAIN +short"
    echo ""
else
    echo "✓ DNS está funcionando correctamente"
fi
echo ""
echo "VERIFICACIONES FINALES:"
echo "----------------------"
echo "1. Verificar que Nginx está escuchando:"
echo "   ss -tlnp | grep nginx | grep 443"
echo ""
echo "2. Verificar que Next.js está corriendo:"
echo "   pm2 status"
echo ""
echo "3. Probar acceso local:"
echo "   curl -k -H 'Host: $DOMAIN' https://127.0.0.1/"
echo ""
echo "4. Probar acceso por IP:"
echo "   curl -k -H 'Host: $DOMAIN' https://$IP/"
echo ""



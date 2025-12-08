#!/bin/bash

# Script de diagnóstico para problemas de acceso a la página web
# Ejecutar en el VPS: bash scripts/diagnostico-acceso.sh

echo "=========================================="
echo "DIAGNÓSTICO DE ACCESO A LA PÁGINA WEB"
echo "=========================================="
echo ""

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Función para mostrar resultados
check_status() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓${NC} $2"
    else
        echo -e "${RED}✗${NC} $2"
    fi
}

echo "1. VERIFICANDO SERVICIOS..."
echo "---------------------------"

# Verificar si Next.js está corriendo
echo -n "Verificando aplicación Next.js (puerto 3000)... "
if ss -tlnp | grep -q ':3000'; then
    check_status 0 "Aplicación Next.js está corriendo en puerto 3000"
    echo "   Proceso: $(ss -tlnp | grep ':3000' | head -1)"
else
    check_status 1 "Aplicación Next.js NO está corriendo en puerto 3000"
fi

# Verificar PM2
echo -n "Verificando PM2... "
if command -v pm2 &> /dev/null; then
    check_status 0 "PM2 está instalado"
    echo "   Estado PM2:"
    pm2 list 2>/dev/null | head -5
else
    check_status 1 "PM2 no está instalado o no está en PATH"
fi

# Verificar Nginx
echo -n "Verificando Nginx... "
if systemctl is-active --quiet nginx; then
    check_status 0 "Nginx está corriendo"
else
    check_status 1 "Nginx NO está corriendo"
    echo "   Intentar: sudo systemctl start nginx"
fi

# Verificar puertos HTTP/HTTPS
echo -n "Verificando puerto 80 (HTTP)... "
if ss -tlnp | grep -q ':80'; then
    check_status 0 "Puerto 80 está escuchando"
else
    check_status 1 "Puerto 80 NO está escuchando"
fi

echo -n "Verificando puerto 443 (HTTPS)... "
if ss -tlnp | grep -q ':443'; then
    check_status 0 "Puerto 443 está escuchando"
else
    check_status 1 "Puerto 443 NO está escuchando"
fi

echo ""
echo "2. VERIFICANDO FIREWALL..."
echo "---------------------------"

# Verificar UFW
if command -v ufw &> /dev/null; then
    echo "Estado de UFW:"
    ufw status numbered 2>/dev/null | head -10
    echo ""
fi

# Verificar iptables
echo "Reglas de iptables INPUT (últimas 10):"
iptables -L INPUT -n -v --line-numbers 2>/dev/null | head -15
echo ""

echo "Reglas que bloquean (DROP/REJECT):"
iptables -L INPUT -n -v 2>/dev/null | grep -E "(DROP|REJECT)" | head -5
if [ $? -ne 0 ]; then
    echo "   No se encontraron reglas DROP/REJECT explícitas"
fi
echo ""

echo "3. VERIFICANDO CONFIGURACIÓN NGINX..."
echo "--------------------------------------"

# Verificar configuración de nginx
NGINX_CONFIG="/home/cyberpol/conf/web/visitantes.cyberpol.com.py/nginx.ssl.conf"
if [ -f "$NGINX_CONFIG" ]; then
    check_status 0 "Archivo de configuración nginx encontrado"
    echo "   Verificando proxy_pass..."
    if grep -q "proxy_pass.*3000" "$NGINX_CONFIG"; then
        check_status 0 "proxy_pass configurado para puerto 3000"
    else
        check_status 1 "proxy_pass NO está configurado para puerto 3000"
    fi
    
    echo "   Verificando headers de IP..."
    if grep -q "X-Real-IP" "$NGINX_CONFIG"; then
        check_status 0 "Headers X-Real-IP configurados"
    else
        check_status 1 "Headers X-Real-IP NO configurados"
    fi
else
    check_status 1 "Archivo de configuración nginx NO encontrado: $NGINX_CONFIG"
fi

# Verificar sintaxis de nginx
echo -n "Verificando sintaxis de nginx... "
if nginx -t 2>&1 | grep -q "successful"; then
    check_status 0 "Sintaxis de nginx correcta"
else
    check_status 1 "Error en sintaxis de nginx"
    nginx -t 2>&1 | tail -3
fi
echo ""

echo "4. VERIFICANDO VARIABLES DE ENTORNO..."
echo "---------------------------------------"

ENV_FILE="/home/cyberpol/web/visitantes.cyberpol.com.py/public_html/.env"
if [ -f "$ENV_FILE" ]; then
    check_status 0 "Archivo .env encontrado"
    echo "   VPN_REQUIRED=$(grep VPN_REQUIRED "$ENV_FILE" | cut -d'=' -f2 | tr -d '"' || echo 'no encontrado')"
    echo "   VPN_RANGE=$(grep VPN_RANGE "$ENV_FILE" | cut -d'=' -f2 | tr -d '"' || echo 'no encontrado')"
    echo "   NODE_ENV=$(grep NODE_ENV "$ENV_FILE" | cut -d'=' -f2 | tr -d '"' || echo 'no encontrado')"
    echo "   PORT=$(grep PORT "$ENV_FILE" | cut -d'=' -f2 | tr -d '"' || echo 'no encontrado')"
else
    check_status 1 "Archivo .env NO encontrado: $ENV_FILE"
fi
echo ""

echo "5. VERIFICANDO CONECTIVIDAD..."
echo "------------------------------"

# Probar conexión local
echo -n "Probando conexión local (localhost:3000)... "
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 | grep -q "200\|301\|302"; then
    check_status 0 "Aplicación responde localmente"
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000)
    echo "   Código HTTP: $HTTP_CODE"
else
    check_status 1 "Aplicación NO responde localmente"
    echo "   Respuesta: $(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 2>&1)"
fi

# Probar a través de nginx
echo -n "Probando a través de nginx (localhost)... "
if curl -s -k -o /dev/null -w "%{http_code}" https://localhost 2>/dev/null | grep -q "200\|301\|302"; then
    check_status 0 "Nginx responde localmente"
    HTTP_CODE=$(curl -s -k -o /dev/null -w "%{http_code}" https://localhost 2>/dev/null)
    echo "   Código HTTP: $HTTP_CODE"
else
    check_status 1 "Nginx NO responde localmente"
fi
echo ""

echo "6. VERIFICANDO LOGS RECIENTES..."
echo "---------------------------------"

# Logs de nginx
echo "Últimas 5 líneas de error de nginx:"
if [ -f "/var/log/nginx/error.log" ]; then
    tail -5 /var/log/nginx/error.log 2>/dev/null || echo "   No se pudo leer el log"
else
    echo "   Archivo de log no encontrado"
fi
echo ""

# Logs de PM2
if command -v pm2 &> /dev/null; then
    echo "Últimas 10 líneas de logs de PM2:"
    pm2 logs --lines 10 --nostream 2>/dev/null | tail -10 || echo "   No se pudieron leer los logs"
    echo ""
fi

echo "7. VERIFICANDO DNS Y ACCESO EXTERNO..."
echo "---------------------------------------"

DOMAIN="visitantes.cyberpol.com.py"
echo "Verificando DNS para $DOMAIN..."
DNS_IP=$(dig +short $DOMAIN 2>/dev/null | tail -1)
if [ -n "$DNS_IP" ]; then
    check_status 0 "DNS resuelve a: $DNS_IP"
else
    check_status 1 "DNS NO resuelve para $DOMAIN"
fi

echo ""
echo "8. RECOMENDACIONES..."
echo "---------------------"

# Verificar si VPN_REQUIRED está en true
if [ -f "$ENV_FILE" ]; then
    VPN_REQUIRED=$(grep VPN_REQUIRED "$ENV_FILE" | cut -d'=' -f2 | tr -d '"' | tr -d "'")
    if [ "$VPN_REQUIRED" = "true" ]; then
        echo -e "${YELLOW}⚠ ADVERTENCIA: VPN_REQUIRED está en 'true'${NC}"
        echo "   Esto significa que solo usuarios conectados a VPN pueden acceder"
        echo "   Si quieres permitir acceso público, cambia a: VPN_REQUIRED=false"
        echo ""
    fi
fi

# Verificar si la aplicación está corriendo
if ! ss -tlnp | grep -q ':3000'; then
    echo -e "${YELLOW}⚠ La aplicación Next.js no está corriendo${NC}"
    echo "   Intentar: pm2 start npm --name axeso -- start"
    echo "   O: cd /home/cyberpol/web/visitantes.cyberpol.com.py/public_html && npm start"
    echo ""
fi

# Verificar firewall
if command -v ufw &> /dev/null; then
    UFW_STATUS=$(ufw status | head -1)
    if echo "$UFW_STATUS" | grep -q "Status: active"; then
        if ! ufw status | grep -q "80/tcp\|443/tcp"; then
            echo -e "${YELLOW}⚠ UFW está activo pero puertos 80/443 pueden no estar permitidos${NC}"
            echo "   Verificar: sudo ufw status numbered"
            echo "   Permitir: sudo ufw allow 80/tcp && sudo ufw allow 443/tcp"
            echo ""
        fi
    fi
fi

echo "=========================================="
echo "DIAGNÓSTICO COMPLETADO"
echo "=========================================="
echo ""
echo "Para probar el endpoint de debug:"
echo "  curl https://visitantes.cyberpol.com.py/api/debug-ip"
echo ""


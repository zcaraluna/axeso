#!/bin/bash

# Script de diagnóstico completo para VPN en visitantes.cyberpol.com.py
# Uso: sudo bash scripts/vpn/diagnosticar-vpn-visitantes.sh [TU_IP_PUBLICA]

set -e

PROJECT_DIR="/home/cyberpol/web/visitantes.cyberpol.com.py/public_html"
ENV_FILE="$PROJECT_DIR/.env"
STATUS_FILE="/var/log/openvpn-status.log"
YOUR_IP="${1:-}"

echo "=========================================="
echo "DIAGNÓSTICO VPN - visitantes.cyberpol.com.py"
echo "=========================================="
echo ""

# 1. Verificar archivo de estado
echo "1. VERIFICANDO ARCHIVO DE ESTADO"
echo "--------------------------------"
if [ -f "$STATUS_FILE" ]; then
    echo "✓ Archivo existe: $STATUS_FILE"
    ls -lh "$STATUS_FILE" | awk '{print "  Tamaño: " $5 ", Permisos: " $1 ", Última modificación: " $6 " " $7 " " $8}'
    
    # Verificar permisos
    if [ -r "$STATUS_FILE" ]; then
        echo "✓ Archivo es legible"
    else
        echo "✗ ERROR: Archivo NO es legible"
        echo "  Solución: sudo chmod 644 $STATUS_FILE"
    fi
else
    echo "✗ ERROR: Archivo NO existe: $STATUS_FILE"
    echo "  Solución: Verificar configuración de OpenVPN"
    echo "  Debe tener en /etc/openvpn/server.conf:"
    echo "    status /var/log/openvpn-status.log 10"
    exit 1
fi

echo ""

# 2. Verificar formato del archivo
echo "2. VERIFICANDO FORMATO DEL ARCHIVO"
echo "-----------------------------------"
echo "Primeras 30 líneas del archivo:"
echo ""
head -n 30 "$STATUS_FILE" | sed 's/^/  /'
echo ""

# Verificar si tiene CLIENT LIST
if grep -q "CLIENT LIST" "$STATUS_FILE"; then
    echo "✓ Contiene 'CLIENT LIST'"
else
    echo "✗ ADVERTENCIA: No se encontró 'CLIENT LIST' en el archivo"
fi

# Verificar si tiene ROUTING TABLE
if grep -q "ROUTING TABLE" "$STATUS_FILE"; then
    echo "✓ Contiene 'ROUTING TABLE'"
else
    echo "✗ ADVERTENCIA: No se encontró 'ROUTING TABLE' en el archivo"
fi

echo ""

# 3. Mostrar conexiones activas
echo "3. CONEXIONES ACTIVAS EN EL ARCHIVO"
echo "-----------------------------------"
echo "Sección CLIENT LIST:"
echo ""
if grep -A 100 "CLIENT LIST" "$STATUS_FILE" | grep -B 100 "ROUTING TABLE" | head -n -1 | tail -n +2 | grep -v "^Updated," | grep -v "^Common Name," | grep -v "^$" | grep -v "^---" | head -n 10; then
    echo ""
else
    echo "  (No se encontraron conexiones activas en CLIENT LIST)"
fi

echo ""
echo "Sección ROUTING TABLE:"
echo ""
if grep -A 100 "ROUTING TABLE" "$STATUS_FILE" | grep -B 100 "GLOBAL STATS\|END" | head -n -1 | tail -n +2 | grep -v "^Virtual Address," | grep -v "^$" | grep -v "^---" | head -n 10; then
    echo ""
else
    echo "  (No se encontraron entradas en ROUTING TABLE)"
fi

echo ""

# 4. Si se proporcionó IP, buscar en el archivo
if [ -n "$YOUR_IP" ]; then
    echo "4. BUSCANDO TU IP: $YOUR_IP"
    echo "---------------------------"
    
    # Buscar en CLIENT LIST
    echo "Buscando en CLIENT LIST..."
    if grep -A 100 "CLIENT LIST" "$STATUS_FILE" | grep -B 100 "ROUTING TABLE" | grep -q "$YOUR_IP"; then
        echo "✓ IP encontrada en CLIENT LIST"
        echo "  Líneas encontradas:"
        grep -A 100 "CLIENT LIST" "$STATUS_FILE" | grep -B 100 "ROUTING TABLE" | grep "$YOUR_IP" | sed 's/^/    /'
    else
        echo "✗ IP NO encontrada en CLIENT LIST"
    fi
    
    echo ""
    
    # Buscar en ROUTING TABLE
    echo "Buscando en ROUTING TABLE..."
    if grep -A 100 "ROUTING TABLE" "$STATUS_FILE" | grep -B 100 "GLOBAL STATS\|END" | grep -q "$YOUR_IP"; then
        echo "✓ IP encontrada en ROUTING TABLE"
        echo "  Líneas encontradas:"
        grep -A 100 "ROUTING TABLE" "$STATUS_FILE" | grep -B 100 "GLOBAL STATS\|END" | grep "$YOUR_IP" | sed 's/^/    /'
    else
        echo "✗ IP NO encontrada en ROUTING TABLE"
    fi
    
    echo ""
fi

# 5. Verificar variables de entorno
echo "5. VERIFICANDO VARIABLES DE ENTORNO"
echo "-----------------------------------"
if [ -f "$ENV_FILE" ]; then
    echo "✓ Archivo .env existe: $ENV_FILE"
    
    # Cargar variables
    source <(grep -v '^#' "$ENV_FILE" | grep -E '^VPN_|^NEXT_PUBLIC_SITE_URL' | sed 's/^/export /')
    
    echo ""
    echo "Variables VPN:"
    echo "  VPN_REQUIRED=${VPN_REQUIRED:-NO CONFIGURADO}"
    echo "  VPN_RANGE=${VPN_RANGE:-NO CONFIGURADO}"
    echo "  VPN_REQUIRED_DOMAINS=${VPN_REQUIRED_DOMAINS:-NO CONFIGURADO}"
    echo "  VPN_API_URL=${VPN_API_URL:-NO CONFIGURADO}"
    echo "  VPN_API_TOKEN=${VPN_API_TOKEN:+CONFIGURADO (oculto)}"
    echo "  NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL:-NO CONFIGURADO}"
    
    if [ "$VPN_REQUIRED" != "true" ]; then
        echo ""
        echo "⚠ ADVERTENCIA: VPN_REQUIRED no está en 'true'"
    fi
    
    if [ -z "$VPN_REQUIRED_DOMAINS" ]; then
        echo ""
        echo "⚠ ADVERTENCIA: VPN_REQUIRED_DOMAINS está vacío (todos los dominios requerirán VPN)"
    else
        if echo "$VPN_REQUIRED_DOMAINS" | grep -q "visitantes.cyberpol.com.py"; then
            echo "  ✓ visitantes.cyberpol.com.py está en VPN_REQUIRED_DOMAINS"
        else
            echo "  ✗ visitantes.cyberpol.com.py NO está en VPN_REQUIRED_DOMAINS"
        fi
    fi
    
    if [ -z "$VPN_API_URL" ]; then
        echo ""
        echo "✗ ERROR: VPN_API_URL no está configurado"
    else
        echo "  ✓ VPN_API_URL configurado: $VPN_API_URL"
    fi
else
    echo "✗ ERROR: Archivo .env NO existe: $ENV_FILE"
fi

echo ""

# 6. Probar endpoint de verificación
echo "6. PROBANDO ENDPOINT DE VERIFICACIÓN"
echo "------------------------------------"
if [ -n "$YOUR_IP" ]; then
    API_URL="${VPN_API_URL:-http://localhost:3000}"
    echo "Probando: $API_URL/api/vpn/check-status?realIp=$YOUR_IP"
    echo ""
    
    if curl -s -m 5 "$API_URL/api/vpn/check-status?realIp=$YOUR_IP" | jq . 2>/dev/null; then
        echo ""
        echo "✓ Endpoint responde correctamente"
    else
        echo "✗ ERROR: Endpoint no responde o hay un error"
        echo "  Verificar que la aplicación está corriendo en $API_URL"
    fi
else
    echo "  (Omitido: proporciona tu IP pública como argumento para probar)"
    echo "  Ejemplo: sudo bash $0 181.91.85.248"
fi

echo ""

# 7. Verificar configuración de OpenVPN
echo "7. VERIFICANDO CONFIGURACIÓN DE OPENVPN"
echo "---------------------------------------"
if [ -f "/etc/openvpn/server.conf" ]; then
    echo "✓ Archivo de configuración existe"
    
    if grep -q "^status" /etc/openvpn/server.conf; then
        echo "✓ Configuración 'status' encontrada:"
        grep "^status" /etc/openvpn/server.conf | sed 's/^/    /'
    else
        echo "✗ ERROR: No se encontró configuración 'status' en /etc/openvpn/server.conf"
        echo "  Debe agregar: status /var/log/openvpn-status.log 10"
    fi
else
    echo "⚠ ADVERTENCIA: No se encontró /etc/openvpn/server.conf"
    echo "  Puede estar en otra ubicación o usar otro nombre"
fi

echo ""

# 8. Resumen y recomendaciones
echo "=========================================="
echo "RESUMEN Y RECOMENDACIONES"
echo "=========================================="
echo ""

if [ -n "$YOUR_IP" ]; then
    echo "Para diagnosticar por qué tu IP ($YOUR_IP) no se detecta:"
    echo ""
    echo "1. Verifica que tu IP aparece en el archivo:"
    echo "   sudo grep '$YOUR_IP' $STATUS_FILE"
    echo ""
    echo "2. Verifica el formato exacto de las líneas con tu IP:"
    echo "   sudo grep '$YOUR_IP' $STATUS_FILE | head -5"
    echo ""
    echo "3. Prueba el endpoint directamente:"
    echo "   curl '$API_URL/api/vpn/check-status?realIp=$YOUR_IP' | jq ."
    echo ""
    echo "4. Verifica los logs de la aplicación:"
    echo "   pm2 logs axeso --lines 50"
    echo ""
fi

echo "5. Si el archivo tiene un formato diferente, puede ser necesario"
echo "   ajustar el código de parsing en app/api/vpn/check-status/route.ts"
echo ""
echo "6. Verifica que Nginx está pasando los headers correctos:"
echo "   Debe tener: proxy_set_header X-Real-IP \$remote_addr;"
echo ""


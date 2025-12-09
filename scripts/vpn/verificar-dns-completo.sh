#!/bin/bash

# Script para verificar DNS completo
# Ejecutar como root: sudo bash scripts/vpn/verificar-dns-completo.sh

echo "=========================================="
echo "VERIFICACIÓN COMPLETA DE DNS"
echo "=========================================="
echo ""

echo "1. Verificar registros DNS en Hestia:"
echo "--------------------------------------"
HESTIA_DNS="/home/cyberpol/conf/dns/visitantes.cyberpol.com.py/dns.conf"
if [ -f "$HESTIA_DNS" ]; then
    echo "✓ Archivo DNS encontrado: $HESTIA_DNS"
    echo ""
    echo "Registros A:"
    grep "TYPE='A'" "$HESTIA_DNS" | head -5
    echo ""
    echo "Registros NS:"
    grep "TYPE='NS'" "$HESTIA_DNS" | head -5
else
    echo "✗ Archivo DNS NO encontrado: $HESTIA_DNS"
fi
echo ""

echo "2. Verificar si BIND está corriendo:"
echo "------------------------------------"
if systemctl is-active --quiet bind9 2>/dev/null || systemctl is-active --quiet named 2>/dev/null; then
    echo "✓ BIND está corriendo"
    systemctl status bind9 2>/dev/null | head -3 || systemctl status named 2>/dev/null | head -3
else
    echo "✗ BIND NO está corriendo"
fi
echo ""

echo "3. Verificar zona DNS en BIND:"
echo "------------------------------"
if [ -f "/etc/bind/named.conf.local" ]; then
    echo "Buscando zona para visitantes.cyberpol.com.py:"
    grep -A 10 "visitantes\|cyberpol" /etc/bind/named.conf.local 2>/dev/null | head -15 || echo "  No se encontró zona"
    
    echo ""
    echo "Archivos de zona:"
    find /etc/bind -name "*visitantes*" -o -name "*cyberpol*" 2>/dev/null | head -5 || echo "  No se encontraron archivos de zona"
else
    echo "✗ /etc/bind/named.conf.local no existe"
fi
echo ""

echo "4. Verificar resolución DNS desde el servidor:"
echo "-----------------------------------------------"
echo "Desde localhost (127.0.0.1):"
dig @127.0.0.1 visitantes.cyberpol.com.py +short 2>/dev/null || echo "  No responde"
echo ""

echo "Desde Google DNS (8.8.8.8):"
dig @8.8.8.8 visitantes.cyberpol.com.py +short 2>/dev/null || echo "  No responde"
echo ""

echo "Desde Cloudflare DNS (1.1.1.1):"
dig @1.1.1.1 visitantes.cyberpol.com.py +short 2>/dev/null || echo "  No responde"
echo ""

echo "5. Verificar servidores de nombres del dominio:"
echo "------------------------------------------------"
echo "Servidores NS para visitantes.cyberpol.com.py:"
dig NS visitantes.cyberpol.com.py +short 2>/dev/null || echo "  No se encontraron servidores NS"
echo ""

echo "Servidores NS para cyberpol.com.py:"
dig NS cyberpol.com.py +short 2>/dev/null || echo "  No se encontraron servidores NS"
echo ""

echo "6. Verificar si Hestia tiene DNS habilitado:"
echo "---------------------------------------------"
if [ -f "/usr/local/hestia/bin/v-list-dns-domain" ]; then
    echo "Listando dominios DNS en Hestia:"
    /usr/local/hestia/bin/v-list-dns-domains cyberpol 2>/dev/null | grep -i visitantes || echo "  No se encontró el dominio"
else
    echo "  Comando de Hestia no disponible"
fi
echo ""

echo "7. Verificar configuración de red del servidor:"
echo "------------------------------------------------"
echo "IP del servidor:"
ip addr show | grep "inet " | grep -v "127.0.0.1" | head -3
echo ""

echo "8. Probar acceso directo por IP:"
echo "--------------------------------"
echo "Probando https://144.202.77.18 con Host header:"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -k -H "Host: visitantes.cyberpol.com.py" https://144.202.77.18/api/debug-ip 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "200" ]; then
    echo "✓ Acceso por IP funciona (HTTP $HTTP_CODE)"
    echo "  Esto confirma que el problema es DNS, no el servidor"
else
    echo "✗ Acceso por IP NO funciona (HTTP $HTTP_CODE)"
fi
echo ""

echo "=========================================="
echo "VERIFICACIÓN COMPLETADA"
echo "=========================================="
echo ""
echo "Si el DNS no funciona:"
echo "  1. Verifica en tu proveedor de dominio que los servidores NS estén configurados"
echo "  2. Verifica que BIND esté corriendo y tenga la zona configurada"
echo "  3. Si usas Hestia, verifica que el DNS esté habilitado para el dominio"
echo ""
echo "Si el acceso por IP funciona pero el DNS no:"
echo "  El problema es DNS, no el servidor. Puedes usar el archivo hosts temporalmente:"
echo "  144.202.77.18 visitantes.cyberpol.com.py"
echo ""


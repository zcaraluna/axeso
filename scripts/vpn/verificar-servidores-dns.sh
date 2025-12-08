#!/bin/bash

# Script para verificar servidores de nombres DNS
# Ejecutar como root: sudo bash scripts/vpn/verificar-servidores-dns.sh

echo "=========================================="
echo "VERIFICACIÓN DE SERVIDORES DNS"
echo "=========================================="
echo ""

echo "1. Verificar servidores de nombres del dominio:"
echo "------------------------------------------------"
dig NS visitantes.cyberpol.com.py +short
echo ""

echo "2. Verificar servidores de nombres del dominio raíz:"
echo "----------------------------------------------------"
dig NS cyberpol.com.py +short
echo ""

echo "3. Verificar si ns1.com.py está funcionando:"
echo "--------------------------------------------"
dig @ns1.com.py visitantes.cyberpol.com.py +short
echo ""

echo "4. Verificar si ns2.com.py está funcionando:"
echo "--------------------------------------------"
dig @ns2.com.py visitantes.cyberpol.com.py +short
echo ""

echo "5. Verificar si BIND está corriendo:"
echo "------------------------------------"
systemctl status bind9 2>/dev/null | head -10 || systemctl status named 2>/dev/null | head -10 || echo "  BIND no está corriendo o no está instalado como servicio"
echo ""

echo "6. Verificar si Hestia tiene DNS habilitado para el dominio:"
echo "-------------------------------------------------------------"
if [ -f "/usr/local/hestia/bin/v-list-dns-domain" ]; then
    /usr/local/hestia/bin/v-list-dns-domain cyberpol visitantes.cyberpol.com.py 2>/dev/null | head -5 || echo "  No se pudo listar el dominio DNS"
else
    echo "  Comando de Hestia no disponible en esa ruta"
fi
echo ""

echo "7. Verificar zona DNS en BIND:"
echo "------------------------------"
if [ -f "/etc/bind/named.conf.local" ]; then
    grep -A 5 "visitantes\|cyberpol" /etc/bind/named.conf.local 2>/dev/null | head -10 || echo "  No se encontró zona en named.conf.local"
fi
echo ""

echo "=========================================="
echo "VERIFICACIÓN COMPLETADA"
echo "=========================================="
echo ""
echo "Si los servidores de nombres no responden:"
echo "  1. Verifica que BIND esté corriendo: sudo systemctl status bind9"
echo "  2. Verifica que los servidores de nombres estén configurados en el proveedor de dominio"
echo "  3. Los servidores ns1.com.py y ns2.com.py deben estar funcionando"
echo ""


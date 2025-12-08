#!/bin/bash

# Script para verificar configuración de DNS en Hestia
# Ejecutar como root: sudo bash scripts/vpn/verificar-dns-hestia.sh

echo "=========================================="
echo "VERIFICACIÓN DE DNS EN HESTIA"
echo "=========================================="
echo ""

echo "1. Verificar configuración de DNS en Hestia:"
echo "--------------------------------------------"
if [ -f "/usr/local/hestia/data/users/cyberpol/dns/visitantes.cyberpol.com.py.conf" ]; then
    echo "Archivo de configuración DNS encontrado:"
    cat /usr/local/hestia/data/users/cyberpol/dns/visitantes.cyberpol.com.py.conf
else
    echo "  ✗ No se encontró configuración DNS en Hestia"
fi
echo ""

echo "2. Verificar si hay servidor DNS configurado:"
echo "----------------------------------------------"
if [ -d "/etc/bind" ]; then
    echo "BIND está instalado"
    if [ -f "/etc/bind/named.conf.local" ]; then
        grep -A 10 "visitantes.cyberpol.com.py" /etc/bind/named.conf.local 2>/dev/null | head -15 || echo "  No se encontró en named.conf.local"
    fi
else
    echo "  BIND no está instalado o no se usa"
fi
echo ""

echo "3. Verificar zona DNS si existe:"
echo "--------------------------------"
find /etc/bind -name "*visitantes*" -o -name "*cyberpol*" 2>/dev/null | head -5
echo ""

echo "4. Verificar si Hestia tiene DNS habilitado:"
echo "--------------------------------------------"
if command -v v-list-dns-domain &> /dev/null; then
    v-list-dns-domain cyberpol visitantes.cyberpol.com.py 2>/dev/null || echo "  Dominio DNS no encontrado en Hestia"
else
    echo "  Comando de Hestia no disponible"
fi
echo ""

echo "5. Verificar registros DNS con dig desde diferentes servidores:"
echo "---------------------------------------------------------------"
echo "Desde Google DNS (8.8.8.8):"
dig @8.8.8.8 visitantes.cyberpol.com.py +short
echo ""
echo "Desde Cloudflare DNS (1.1.1.1):"
dig @1.1.1.1 visitantes.cyberpol.com.py +short
echo ""

echo "=========================================="
echo "VERIFICACIÓN COMPLETADA"
echo "=========================================="
echo ""
echo "Si el DNS no funciona desde servidores públicos:"
echo "  1. Verifica el registro DNS en tu proveedor de dominio"
echo "  2. O configura el DNS en Hestia CP si está gestionado ahí"
echo "  3. El registro debe ser: visitantes.cyberpol.com.py -> 144.202.77.18"
echo ""


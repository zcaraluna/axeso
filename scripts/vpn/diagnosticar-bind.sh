#!/bin/bash

# Script para diagnosticar por qué BIND no inicia
# Ejecutar como root: sudo bash scripts/vpn/diagnosticar-bind.sh

echo "=========================================="
echo "DIAGNÓSTICO DE BIND"
echo "=========================================="
echo ""

echo "1. Verificar logs de BIND:"
echo "--------------------------"
journalctl -u named.service --no-pager -n 20 2>/dev/null || journalctl -u bind9.service --no-pager -n 20 2>/dev/null || echo "  No se encontraron logs"
echo ""

echo "2. Verificar sintaxis de configuración de BIND:"
echo "-----------------------------------------------"
if [ -f "/etc/bind/named.conf" ]; then
    named-checkconf /etc/bind/named.conf 2>&1 || echo "  Error en configuración principal"
else
    echo "  /etc/bind/named.conf no existe"
fi
echo ""

echo "3. Verificar archivos de configuración:"
echo "---------------------------------------"
ls -la /etc/bind/ 2>/dev/null | head -10 || echo "  /etc/bind/ no existe"
echo ""

echo "4. Verificar si Hestia tiene archivos de zona:"
echo "----------------------------------------------"
if [ -d "/home/cyberpol/conf/dns" ]; then
    echo "Directorios DNS en Hestia:"
    find /home/cyberpol/conf/dns -type d -name "*visitantes*" -o -name "*cyberpol*" 2>/dev/null | head -5
    echo ""
    echo "Archivos de configuración DNS:"
    find /home/cyberpol/conf/dns -name "*.conf" 2>/dev/null | head -5
else
    echo "  /home/cyberpol/conf/dns no existe"
fi
echo ""

echo "5. Intentar iniciar BIND con más información:"
echo "----------------------------------------------"
systemctl status named.service --no-pager -l 2>/dev/null || systemctl status bind9.service --no-pager -l 2>/dev/null || echo "  No se pudo obtener estado"
echo ""

echo "6. Verificar si Hestia puede regenerar la configuración DNS:"
echo "------------------------------------------------------------"
if [ -f "/usr/local/hestia/bin/v-rebuild-dns-domains" ]; then
    echo "✓ Comando de reconstrucción DNS disponible"
    echo ""
    echo "Para regenerar configuración DNS en Hestia, ejecuta:"
    echo "  /usr/local/hestia/bin/v-rebuild-dns-domains cyberpol visitantes.cyberpol.com.py"
else
    echo "✗ Comando de reconstrucción DNS no disponible"
fi
echo ""

echo "7. Verificar permisos de archivos BIND:"
echo "--------------------------------------"
if [ -d "/etc/bind" ]; then
    ls -la /etc/bind/ | head -10
fi
echo ""

echo "=========================================="
echo "DIAGNÓSTICO COMPLETADO"
echo "=========================================="
echo ""
echo "Si BIND no puede iniciar, probablemente necesitas:"
echo "  1. Regenerar la configuración DNS en Hestia"
echo "  2. O configurar DNS externo (Cloudflare, etc.)"
echo ""


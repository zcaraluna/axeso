#!/bin/bash

# Script para verificar la configuración del servidor OpenVPN
# y detectar posibles conflictos con los clientes
# Ejecutar como root: sudo bash scripts/vpn/verificar-configuracion-servidor.sh

set -e

SERVER_CONF="/etc/openvpn/server.conf"

echo "=========================================="
echo "VERIFICACIÓN DE CONFIGURACIÓN DEL SERVIDOR"
echo "=========================================="
echo ""

if [ ! -f "$SERVER_CONF" ]; then
    echo "✗ Error: Archivo de configuración no encontrado: $SERVER_CONF"
    exit 1
fi

echo "1. Verificando configuración de compresión..."
echo "---------------------------------------------"
if grep -q "^comp-lzo" "$SERVER_CONF"; then
    echo "⚠ ADVERTENCIA: El servidor usa 'comp-lzo' (antiguo)"
    echo "  Recomendación: Cambiar a 'compress lzo' para mejor estabilidad"
    echo "  Línea encontrada:"
    grep "^comp-lzo" "$SERVER_CONF" | sed 's/^/    /'
elif grep -q "^compress" "$SERVER_CONF"; then
    echo "✓ El servidor usa 'compress' (moderno)"
    grep "^compress" "$SERVER_CONF" | sed 's/^/    /'
else
    echo "⚠ No se encontró configuración de compresión"
    echo "  El servidor puede no estar comprimiendo datos"
fi
echo ""

echo "2. Verificando configuración de keepalive..."
echo "--------------------------------------------"
if grep -q "^keepalive" "$SERVER_CONF"; then
    echo "✓ Keepalive configurado:"
    grep "^keepalive" "$SERVER_CONF" | sed 's/^/    /'
else
    echo "⚠ No se encontró configuración de keepalive"
    echo "  Esto puede causar desconexiones si no hay tráfico"
fi
echo ""

echo "3. Verificando configuración de redirect-gateway..."
echo "----------------------------------------------------"
if grep -q "redirect-gateway" "$SERVER_CONF"; then
    echo "⚠ El servidor está empujando 'redirect-gateway':"
    grep "redirect-gateway" "$SERVER_CONF" | sed 's/^/    /'
    echo ""
    echo "  NOTA: Si los clientes tienen problemas de conectividad a internet,"
    echo "  puede ser porque el redirect-gateway está causando conflictos de routing"
else
    echo "✓ No se encontró 'redirect-gateway' en la configuración del servidor"
fi
echo ""

echo "4. Verificando configuración de DNS..."
echo "--------------------------------------"
if grep -q "dhcp-option DNS" "$SERVER_CONF"; then
    echo "✓ DNS configurado:"
    grep "dhcp-option DNS" "$SERVER_CONF" | sed 's/^/    /'
else
    echo "⚠ No se encontró configuración de DNS"
    echo "  Los clientes pueden tener problemas resolviendo nombres"
fi
echo ""

echo "5. Verificando configuración de cifrado..."
echo "-------------------------------------------"
if grep -q "^cipher" "$SERVER_CONF"; then
    echo "✓ Cipher configurado:"
    grep "^cipher" "$SERVER_CONF" | sed 's/^/    /'
fi
if grep -q "^data-ciphers" "$SERVER_CONF"; then
    echo "✓ Data-ciphers configurado:"
    grep "^data-ciphers" "$SERVER_CONF" | sed 's/^/    /'
fi
echo ""

echo "6. Resumen de recomendaciones..."
echo "---------------------------------"
echo ""
echo "Si los clientes se desconectan constantemente:"
echo "  1. Verificar que 'compress' coincida entre servidor y cliente"
echo "  2. Asegurar que 'keepalive' esté configurado en ambos"
echo "  3. Verificar logs del servidor: sudo journalctl -u openvpn@server -f"
echo "  4. Verificar logs del cliente en Windows"
echo ""
echo "Si los clientes no pueden acceder a internet:"
echo "  1. Verificar que 'redirect-gateway' no esté causando conflictos"
echo "  2. Verificar que el firewall del servidor permita NAT"
echo "  3. Verificar que IP forwarding esté habilitado: cat /proc/sys/net/ipv4/ip_forward"
echo ""



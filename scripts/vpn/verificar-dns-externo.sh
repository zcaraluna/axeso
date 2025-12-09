#!/bin/bash

# Script para verificar que el DNS funciona desde servidores externos
# Ejecutar como root: sudo bash scripts/vpn/verificar-dns-externo.sh

echo "=========================================="
echo "VERIFICACIÓN DNS EXTERNO"
echo "=========================================="
echo ""

echo "1. Verificar que BIND está corriendo:"
echo "-------------------------------------"
if systemctl is-active --quiet named.service; then
    echo "✓ BIND está corriendo"
else
    echo "✗ BIND NO está corriendo"
    exit 1
fi
echo ""

echo "2. Verificar resolución local (desde el servidor):"
echo "---------------------------------------------------"
LOCAL_RESULT=$(dig @127.0.0.1 visitantes.cyberpol.com.py +short 2>/dev/null)
if [ -n "$LOCAL_RESULT" ]; then
    echo "✓ Resolución local funciona: $LOCAL_RESULT"
else
    echo "✗ Resolución local NO funciona"
fi
echo ""

echo "3. Verificar resolución desde Google DNS (8.8.8.8):"
echo "----------------------------------------------------"
GOOGLE_RESULT=$(dig @8.8.8.8 visitantes.cyberpol.com.py +short 2>/dev/null)
if [ -n "$GOOGLE_RESULT" ]; then
    echo "✓ Google DNS resuelve: $GOOGLE_RESULT"
else
    echo "✗ Google DNS NO resuelve (puede tardar en propagarse)"
fi
echo ""

echo "4. Verificar resolución desde Cloudflare DNS (1.1.1.1):"
echo "--------------------------------------------------------"
CF_RESULT=$(dig @1.1.1.1 visitantes.cyberpol.com.py +short 2>/dev/null)
if [ -n "$CF_RESULT" ]; then
    echo "✓ Cloudflare DNS resuelve: $CF_RESULT"
else
    echo "✗ Cloudflare DNS NO resuelve (puede tardar en propagarse)"
fi
echo ""

echo "5. Verificar servidores NS del dominio:"
echo "---------------------------------------"
echo "Servidores NS para cyberpol.com.py:"
NS_SERVERS=$(dig NS cyberpol.com.py +short @8.8.8.8 2>/dev/null)
if [ -n "$NS_SERVERS" ]; then
    echo "$NS_SERVERS"
    echo ""
    echo "Verificando si estos servidores apuntan a este servidor:"
    for ns in $NS_SERVERS; do
        NS_IP=$(dig A $ns +short @8.8.8.8 2>/dev/null | head -1)
        echo "  $ns -> $NS_IP"
        if [ "$NS_IP" = "144.202.77.18" ]; then
            echo "    ✓ Este servidor es el NS"
        fi
    done
else
    echo "  No se encontraron servidores NS"
fi
echo ""

echo "6. Verificar que BIND está escuchando en el puerto 53:"
echo "------------------------------------------------------"
if ss -tuln | grep -q ":53"; then
    echo "✓ BIND está escuchando en puerto 53:"
    ss -tuln | grep ":53"
else
    echo "✗ BIND NO está escuchando en puerto 53"
fi
echo ""

echo "7. Verificar firewall (iptables) permite puerto 53:"
echo "---------------------------------------------------"
if iptables -L INPUT -n | grep -q "53"; then
    echo "✓ Reglas de firewall para puerto 53:"
    iptables -L INPUT -n | grep "53"
else
    echo "⚠ No se encontraron reglas específicas para puerto 53"
    echo "  Verificando si hay reglas generales que permitan DNS..."
    if iptables -L INPUT -n | grep -q "ACCEPT.*udp.*dpt:53\|ACCEPT.*tcp.*dpt:53"; then
        echo "  ✓ Hay reglas que permiten DNS"
    else
        echo "  ✗ Puede ser necesario agregar reglas para puerto 53"
    fi
fi
echo ""

echo "=========================================="
echo "VERIFICACIÓN COMPLETADA"
echo "=========================================="
echo ""
echo "RESUMEN:"
echo "  - Si la resolución local funciona pero la externa no:"
echo "    → El problema es que los servidores NS no apuntan a este servidor"
echo "    → O la propagación DNS puede tardar hasta 48 horas"
echo ""
echo "  - Si todo funciona:"
echo "    → Prueba acceder desde tu navegador: https://visitantes.cyberpol.com.py"
echo ""
echo "  - Si aún no funciona desde el navegador:"
echo "    → Usa el archivo hosts temporalmente (ya te expliqué cómo)"
echo "    → O espera a que se propague el DNS (puede tardar)"
echo ""


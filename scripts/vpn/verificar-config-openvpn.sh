#!/bin/bash

# Script para verificar y corregir la configuración de OpenVPN
# Ejecutar como root: sudo bash scripts/vpn/verificar-config-openvpn.sh

OPENVPN_DIR="/etc/openvpn"
SERVER_CONF="$OPENVPN_DIR/server.conf"

echo "Verificando configuración de OpenVPN..."
echo ""

# Verificar si user/group están comentados
if grep -q "^user nobody" "$SERVER_CONF" || grep -q "^group nogroup" "$SERVER_CONF"; then
    echo "⚠ ADVERTENCIA: user/group no están comentados"
    echo "Comentando user y group..."
    
    # Hacer backup
    cp "$SERVER_CONF" "${SERVER_CONF}.backup.$(date +%Y%m%d_%H%M%S)"
    
    # Comentar user y group
    sed -i 's/^user nobody/#user nobody/' "$SERVER_CONF"
    sed -i 's/^group nogroup/#group nogroup/' "$SERVER_CONF"
    
    echo "✓ user y group comentados"
else
    echo "✓ user y group ya están comentados o no existen"
fi

echo ""
echo "Configuración actual de user/group:"
grep -E "^#?user|^#?group" "$SERVER_CONF" || echo "  No se encontraron líneas user/group"

echo ""
echo "Verificando client-connect:"
if grep -q "client-connect" "$SERVER_CONF"; then
    echo "✓ client-connect configurado:"
    grep "client-connect" "$SERVER_CONF"
else
    echo "✗ client-connect NO está configurado"
fi

echo ""
echo "Si hiciste cambios, reinicia OpenVPN:"
echo "  sudo systemctl restart openvpn@server"


#!/bin/bash

# Script para deshabilitar temporalmente los hooks de OpenVPN
# Ejecutar como root: sudo bash scripts/vpn/deshabilitar-hooks-temporalmente.sh

set -e

SERVER_CONF="/etc/openvpn/server.conf"

echo "=========================================="
echo "DESHABILITANDO HOOKS TEMPORALMENTE"
echo "=========================================="
echo ""

# Hacer backup
BACKUP_FILE="${SERVER_CONF}.backup.$(date +%Y%m%d_%H%M%S)"
cp "$SERVER_CONF" "$BACKUP_FILE"
echo "Backup creado: $BACKUP_FILE"
echo ""

# Comentar los hooks
echo "Comentando hooks..."
sed -i 's/^client-connect/#client-connect/' "$SERVER_CONF"
sed -i 's/^client-disconnect/#client-disconnect/' "$SERVER_CONF"

echo "✓ Hooks deshabilitados (comentados)"
echo ""

# Verificar sintaxis
echo "Verificando sintaxis..."
if openvpn --config "$SERVER_CONF" --verb 0 --dev null --test-crypto 2>&1 | grep -q "Configuration errors"; then
    echo "✗ Error en sintaxis"
    openvpn --config "$SERVER_CONF" --verb 0 --dev null --test-crypto
    exit 1
fi

echo "✓ Sintaxis correcta"
echo ""

# Reiniciar OpenVPN
echo "Reiniciando OpenVPN..."
systemctl restart openvpn@server
sleep 2

# Verificar estado
if systemctl is-active --quiet openvpn@server; then
    echo "✓ OpenVPN está corriendo"
else
    echo "✗ OpenVPN no está corriendo"
    echo "Ver logs: sudo journalctl -u openvpn@server -n 50"
fi

echo ""
echo "Para volver a habilitar los hooks:"
echo "  sudo bash scripts/vpn/configurar-hooks-completos.sh"
echo ""


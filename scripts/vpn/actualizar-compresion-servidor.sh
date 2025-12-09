#!/bin/bash

# Script para actualizar la compresión del servidor de comp-lzo a compress
# para mejorar la estabilidad de las conexiones
# Ejecutar como root: sudo bash scripts/vpn/actualizar-compresion-servidor.sh

set -e

SERVER_CONF="/etc/openvpn/server.conf"

echo "=========================================="
echo "ACTUALIZAR COMPRESIÓN DEL SERVIDOR"
echo "=========================================="
echo ""

if [ ! -f "$SERVER_CONF" ]; then
    echo "✗ Error: Archivo de configuración no encontrado: $SERVER_CONF"
    exit 1
fi

# 1. Hacer backup
echo "1. Creando backup..."
echo "-------------------"
BACKUP_FILE="${SERVER_CONF}.backup.$(date +%Y%m%d_%H%M%S)"
cp "$SERVER_CONF" "$BACKUP_FILE"
echo "✓ Backup creado: $BACKUP_FILE"
echo ""

# 2. Verificar configuración actual
echo "2. Verificando configuración actual..."
echo "---------------------------------------"
if grep -q "^comp-lzo" "$SERVER_CONF"; then
    echo "⚠ Encontrado 'comp-lzo' (antiguo)"
    grep "^comp-lzo" "$SERVER_CONF" | sed 's/^/    /'
    echo ""
    echo "  Actualizando a 'compress lzo' (moderno y más estable)..."
    
    # Reemplazar comp-lzo por compress lzo
    sed -i 's/^comp-lzo/compress lzo/' "$SERVER_CONF"
    
    echo "✓ Actualizado a 'compress lzo'"
elif grep -q "^compress" "$SERVER_CONF"; then
    echo "✓ Ya está usando 'compress' (moderno)"
    grep "^compress" "$SERVER_CONF" | sed 's/^/    /'
    echo ""
    echo "  No es necesario actualizar"
else
    echo "⚠ No se encontró configuración de compresión"
    echo ""
    echo "  Agregando 'compress lzo'..."
    echo "" >> "$SERVER_CONF"
    echo "# Compresión LZO (más estable que comp-lzo)" >> "$SERVER_CONF"
    echo "compress lzo" >> "$SERVER_CONF"
    echo "✓ Agregado 'compress lzo'"
fi
echo ""

# 3. Verificar sintaxis
echo "3. Verificando sintaxis de OpenVPN..."
echo "--------------------------------------"
if openvpn --config "$SERVER_CONF" --verb 0 --dev null --test-crypto 2>&1 | grep -q "Configuration errors"; then
    echo "✗ Error: Hay errores en la configuración"
    openvpn --config "$SERVER_CONF" --verb 0 --dev null --test-crypto
    echo ""
    echo "  Restaurando backup..."
    cp "$BACKUP_FILE" "$SERVER_CONF"
    echo "  Backup restaurado"
    exit 1
fi
echo "✓ Sintaxis correcta"
echo ""

# 4. Reiniciar OpenVPN
echo "4. Reiniciando OpenVPN..."
echo "-------------------------"
systemctl daemon-reload
systemctl restart openvpn@server
sleep 3

if systemctl is-active --quiet openvpn@server; then
    echo "✓ OpenVPN reiniciado y corriendo"
else
    echo "✗ Error: OpenVPN no está corriendo"
    echo "  Ver logs: sudo journalctl -u openvpn@server -n 50"
    echo ""
    echo "  Restaurando backup..."
    cp "$BACKUP_FILE" "$SERVER_CONF"
    systemctl restart openvpn@server
    echo "  Backup restaurado y OpenVPN reiniciado"
    exit 1
fi
echo ""

echo "=========================================="
echo "ACTUALIZACIÓN COMPLETADA"
echo "=========================================="
echo ""
echo "Cambios realizados:"
echo "  - 'comp-lzo' → 'compress lzo' (más estable)"
echo ""
echo "NOTA IMPORTANTE:"
echo "  Los certificados generados con el script actualizado ya usan 'compress lzo'"
echo "  Si tienes certificados antiguos con 'comp-lzo', deberían seguir funcionando,"
echo "  pero es recomendable regenerarlos con el script actualizado para mejor estabilidad."
echo ""


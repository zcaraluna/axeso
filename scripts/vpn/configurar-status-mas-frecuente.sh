#!/bin/bash

# Script para configurar OpenVPN para actualizar el archivo de estado más frecuentemente
# Ejecutar como root: sudo bash scripts/vpn/configurar-status-mas-frecuente.sh

set -e

SERVER_CONF="/etc/openvpn/server.conf"

echo "=========================================="
echo "CONFIGURAR ACTUALIZACIÓN MÁS FRECUENTE"
echo "=========================================="
echo ""

# 1. Hacer backup
echo "1. Creando backup..."
echo "-------------------"
BACKUP_FILE="${SERVER_CONF}.backup.$(date +%Y%m%d_%H%M%S)"
cp "$SERVER_CONF" "$BACKUP_FILE"
echo "✓ Backup creado: $BACKUP_FILE"
echo ""

# 2. Verificar configuración actual
echo "2. Configuración actual de status:"
echo "-----------------------------------"
if grep -q "^status" "$SERVER_CONF"; then
    echo "Configuración actual:"
    grep "^status" "$SERVER_CONF" | sed 's/^/  /'
    
    # Verificar si tiene intervalo
    if grep -q "^status" "$SERVER_CONF" | grep -q "[0-9]"; then
        echo "  ✓ Ya tiene intervalo configurado"
    else
        echo "  ⚠ No tiene intervalo configurado (usando default ~20 segundos)"
    fi
else
    echo "✗ status NO está configurado"
fi
echo ""

# 3. Agregar/actualizar configuración con intervalo más corto
echo "3. Configurando actualización cada 10 segundos..."
echo "--------------------------------------------------"
# Eliminar líneas de status existentes
sed -i '/^status /d' "$SERVER_CONF"

# Agregar nueva configuración con intervalo de 10 segundos
echo "" >> "$SERVER_CONF"
echo "# Archivo de estado actualizado cada 10 segundos para detección más rápida" >> "$SERVER_CONF"
echo "status /var/log/openvpn-status.log 10" >> "$SERVER_CONF"
echo "status-version 2" >> "$SERVER_CONF"
echo "✓ Configuración agregada"
echo ""

# 4. Verificar sintaxis
echo "4. Verificando sintaxis..."
echo "--------------------------"
if openvpn --config "$SERVER_CONF" --verb 0 --dev null --test-crypto 2>&1 | grep -q "Configuration errors"; then
    echo "✗ Error en sintaxis"
    openvpn --config "$SERVER_CONF" --verb 0 --dev null --test-crypto
    echo ""
    echo "Restaurando backup..."
    cp "$BACKUP_FILE" "$SERVER_CONF"
    exit 1
fi
echo "✓ Sintaxis correcta"
echo ""

# 5. Reiniciar OpenVPN
echo "5. Reiniciando OpenVPN..."
echo "-------------------------"
systemctl restart openvpn@server
sleep 2

if systemctl is-active --quiet openvpn@server; then
    echo "✓ OpenVPN reiniciado"
else
    echo "✗ Error al reiniciar OpenVPN"
    exit 1
fi
echo ""

echo "=========================================="
echo "CONFIGURACIÓN COMPLETADA"
echo "=========================================="
echo ""
echo "El archivo de estado ahora se actualizará cada 10 segundos"
echo "Esto permitirá detectar desconexiones más rápidamente (~30-40 segundos)"
echo ""
echo "Para verificar:"
echo "  sudo tail -f /var/log/openvpn-status.log"
echo ""


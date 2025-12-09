#!/bin/bash

# Script para monitorear logs de OpenVPN en tiempo real cuando se intenta conectar
# Ejecutar como root: sudo bash scripts/vpn/verificar-hook-en-tiempo-real.sh

echo "=========================================="
echo "MONITOREO DE HOOKS EN TIEMPO REAL"
echo "=========================================="
echo ""
echo "Este script monitoreará los logs de OpenVPN."
echo "Intenta conectarte desde Windows ahora."
echo "Presiona Ctrl+C para salir."
echo ""
echo "=========================================="
echo ""

# Monitorear logs en tiempo real
journalctl -u openvpn@server -f --no-pager | while read line; do
    # Resaltar mensajes importantes
    if echo "$line" | grep -qiE "client-connect|register|hook|error|failed|auth"; then
        echo -e "\033[1;31m$line\033[0m"  # Rojo para errores
    elif echo "$line" | grep -qiE "connected|register|success"; then
        echo -e "\033[1;32m$line\033[0m"  # Verde para éxito
    else
        echo "$line"
    fi
done


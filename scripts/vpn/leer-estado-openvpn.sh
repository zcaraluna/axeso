#!/bin/bash

# Script para leer el estado de OpenVPN y mostrar conexiones activas
# Ejecutar como root: sudo bash scripts/vpn/leer-estado-openvpn.sh

echo "=========================================="
echo "ESTADO DE OPENVPN"
echo "=========================================="
echo ""

if [ -f "/var/log/openvpn-status.log" ]; then
    echo "Contenido del archivo de estado:"
    echo "---------------------------------"
    cat /var/log/openvpn-status.log
else
    echo "✗ Archivo /var/log/openvpn-status.log no existe"
    echo ""
    echo "Verificando configuración de OpenVPN:"
    grep -E "^status|^status-version" /etc/openvpn/server.conf | sed 's/^/  /' || echo "  (no se encontró configuración de status)"
fi
echo ""


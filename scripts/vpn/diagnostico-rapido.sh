#!/bin/bash

# Script de diagnóstico rápido
# Ejecutar como root: sudo bash scripts/vpn/diagnostico-rapido.sh

echo "=========================================="
echo "DIAGNÓSTICO RÁPIDO"
echo "=========================================="
echo ""

echo "1. Estado de OpenVPN:"
echo "---------------------"
systemctl status openvpn@server --no-pager -l | head -15
echo ""

echo "2. Estado de PM2:"
echo "-----------------"
pm2 status
echo ""

echo "3. Puerto 3000:"
echo "---------------"
ss -tlnp | grep 3000 || echo "  Puerto 3000 no está escuchando"
echo ""

echo "4. Puerto 1194 (OpenVPN):"
echo "-------------------------"
ss -tulnp | grep 1194 || echo "  Puerto 1194 no está escuchando"
echo ""

echo "5. Conexiones VPN activas:"
echo "--------------------------"
if [ -f /var/log/openvpn-status.log ]; then
    cat /var/log/openvpn-status.log | grep -A 10 "CLIENT LIST" | head -15
else
    echo "  Archivo de estado no encontrado"
fi
echo ""

echo "6. Probar aplicación web:"
echo "-------------------------"
curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" http://localhost:3000/api/debug-ip || echo "  No responde"
echo ""

echo "7. Verificar hooks en server.conf:"
echo "----------------------------------"
grep -E "^#?client-connect|^#?client-disconnect" /etc/openvpn/server.conf || echo "  No se encontraron hooks"
echo ""

echo "=========================================="
echo "DIAGNÓSTICO COMPLETADO"
echo "=========================================="


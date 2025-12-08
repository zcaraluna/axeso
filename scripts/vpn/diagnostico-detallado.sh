#!/bin/bash

# Script de diagnóstico detallado
# Ejecutar como root: sudo bash scripts/vpn/diagnostico-detallado.sh

echo "=========================================="
echo "DIAGNÓSTICO DETALLADO"
echo "=========================================="
echo ""

echo "1. Puerto 3000 (TCP y UDP):"
echo "----------------------------"
ss -tulnp | grep 3000
echo ""

echo "2. Puerto 3000 específicamente TCP:"
echo "-----------------------------------"
ss -tlnp | grep 3000
echo ""

echo "3. Puerto 1194 (UDP - OpenVPN):"
echo "-------------------------------"
ss -ulnp | grep 1194
echo ""

echo "4. Proceso Next.js:"
echo "-------------------"
ps aux | grep -E "next|node.*3000" | grep -v grep
echo ""

echo "5. Probar aplicación desde localhost:"
echo "--------------------------------------"
curl -s http://localhost:3000/api/debug-ip | head -5
echo ""

echo "6. Verificar que Next.js está escuchando:"
echo "------------------------------------------"
netstat -tlnp 2>/dev/null | grep 3000 || ss -tlnp | grep 3000
echo ""

echo "7. Verificar firewall para puerto 3000:"
echo "----------------------------------------"
iptables -L -n | grep 3000 || echo "  No hay reglas específicas para 3000"
echo ""

echo "8. Verificar que Nginx puede hacer proxy:"
echo "-----------------------------------------"
curl -s -H "Host: visitantes.cyberpol.com.py" http://localhost/api/debug-ip 2>&1 | head -5
echo ""

echo "9. Estado de Nginx:"
echo "-------------------"
systemctl status nginx --no-pager | head -10
echo ""

echo "=========================================="
echo "DIAGNÓSTICO COMPLETADO"
echo "=========================================="


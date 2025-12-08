#!/bin/bash

# Script para verificar si Nginx está escuchando en la IP específica
# Ejecutar como root: sudo bash scripts/vpn/verificar-nginx-listen-ip.sh

echo "=========================================="
echo "VERIFICACIÓN DE NGINX ESCUCHANDO"
echo "=========================================="
echo ""

echo "1. Verificar procesos de Nginx:"
echo "-------------------------------"
ps aux | grep nginx | grep -v grep
echo ""

echo "2. Verificar puertos escuchando (todas las interfaces):"
echo "--------------------------------------------------------"
ss -tlnp | head -20
echo ""

echo "3. Verificar específicamente IP 144.202.77.18:"
echo "----------------------------------------------"
ss -tlnp | grep "144.202.77.18"
echo ""

echo "4. Probar acceso HTTP al dominio (simulando desde fuera):"
echo "----------------------------------------------------------"
curl -v -H "Host: visitantes.cyberpol.com.py" http://144.202.77.18/ 2>&1 | head -20
echo ""

echo "5. Probar acceso HTTPS al dominio:"
echo "----------------------------------"
curl -v -k -H "Host: visitantes.cyberpol.com.py" https://144.202.77.18/ 2>&1 | head -20
echo ""

echo "6. Ver logs de error recientes:"
echo "-------------------------------"
tail -10 /var/log/apache2/domains/visitantes.cyberpol.com.py.error.log 2>/dev/null | tail -5
echo ""

echo "7. Verificar que Nginx puede resolver localhost:"
echo "------------------------------------------------"
getent hosts localhost
echo ""

echo "8. Probar proxy desde Nginx directamente:"
echo "-----------------------------------------"
curl -s -H "Host: visitantes.cyberpol.com.py" http://127.0.0.1/api/debug-ip 2>&1 | head -5
echo ""

echo "=========================================="
echo "VERIFICACIÓN COMPLETADA"
echo "=========================================="


#!/bin/bash

# Script para verificar conexiones VPN en nginx
# Ejecutar en el VPS

echo "Verificando conexiones desde la VPN en los logs de nginx..."
echo ""

echo "Últimas 20 conexiones:"
tail -20 /var/log/apache2/domains/visitantes.cyberpol.com.py.log | grep -E "(10.8.0|181.91.85.248)"

echo ""
echo "Buscando conexiones desde rango VPN (10.8.0.0/24):"
grep "10.8.0" /var/log/apache2/domains/visitantes.cyberpol.com.py.log | tail -10

echo ""
echo "Verificando qué IP está recibiendo nginx actualmente:"
echo "Ejecuta esto mientras accedes a la página:"
echo "  tail -f /var/log/apache2/domains/visitantes.cyberpol.com.py.log | grep -E '(10.8.0|181.91.85.248)'"


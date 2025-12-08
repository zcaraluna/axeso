#!/bin/bash

# Script para verificar DNS desde el servidor
# Ejecutar como root: sudo bash scripts/vpn/verificar-dns-servidor.sh

echo "=========================================="
echo "VERIFICACIÓN DE DNS DESDE EL SERVIDOR"
echo "=========================================="
echo ""

echo "1. Verificar DNS con dig:"
echo "-------------------------"
dig visitantes.cyberpol.com.py +short
echo ""

echo "2. Verificar DNS con nslookup:"
echo "------------------------------"
nslookup visitantes.cyberpol.com.py 2>&1 | tail -5
echo ""

echo "3. Verificar DNS con host:"
echo "--------------------------"
host visitantes.cyberpol.com.py 2>&1 | tail -3
echo ""

echo "4. Verificar que el dominio resuelve a la IP correcta:"
echo "------------------------------------------------------"
RESOLVED_IP=$(dig +short visitantes.cyberpol.com.py | tail -1)
EXPECTED_IP="144.202.77.18"

if [ "$RESOLVED_IP" = "$EXPECTED_IP" ]; then
    echo "  ✓ DNS resuelve correctamente: $RESOLVED_IP"
else
    echo "  ✗ DNS NO resuelve correctamente"
    echo "    Resuelto: $RESOLVED_IP"
    echo "    Esperado: $EXPECTED_IP"
fi
echo ""

echo "=========================================="
echo "VERIFICACIÓN COMPLETADA"
echo "=========================================="
echo ""
echo "Si el DNS funciona desde el servidor pero no desde Windows:"
echo "  1. Limpia el cache DNS en Windows: ipconfig /flushdns"
echo "  2. Verifica que Windows esté usando DNS públicos (8.8.8.8, 1.1.1.1)"
echo "  3. O agrega temporalmente al archivo hosts de Windows"
echo ""


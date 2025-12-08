#!/bin/bash

# Script rápido para verificar el endpoint de debug
# Ejecutar en el VPS: bash scripts/verificar-endpoint.sh

echo "Verificando endpoint de debug..."
echo ""

# Probar endpoint local
echo "1. Probando localmente (localhost:3000/api/debug-ip):"
curl -s http://localhost:3000/api/debug-ip | jq '.' 2>/dev/null || curl -s http://localhost:3000/api/debug-ip
echo ""
echo ""

# Probar a través de nginx
echo "2. Probando a través de nginx (https://visitantes.cyberpol.com.py/api/debug-ip):"
curl -s -k https://visitantes.cyberpol.com.py/api/debug-ip | jq '.' 2>/dev/null || curl -s -k https://visitantes.cyberpol.com.py/api/debug-ip
echo ""


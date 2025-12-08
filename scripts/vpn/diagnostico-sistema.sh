#!/bin/bash

# Script para diagnosticar problemas del sistema
# Ejecutar como root: sudo bash scripts/vpn/diagnostico-sistema.sh

echo "=========================================="
echo "DIAGNÓSTICO DEL SISTEMA"
echo "=========================================="
echo ""

echo "1. Memoria disponible:"
echo "---------------------"
free -h
echo ""

echo "2. Estado de PM2:"
echo "-----------------"
pm2 status
echo ""

echo "3. Uso de memoria por proceso:"
echo "-------------------------------"
ps aux --sort=-%mem | head -10
echo ""

echo "4. Verificar que Next.js está corriendo:"
echo "-----------------------------------------"
curl -s http://localhost:3000/api/debug-ip | head -5 || echo "  ✗ No responde"
echo ""

echo "5. Logs recientes de PM2:"
echo "-------------------------"
pm2 logs axeso --lines 10 --nostream 2>&1 | tail -20
echo ""


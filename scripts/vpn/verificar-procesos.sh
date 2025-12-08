#!/bin/bash

# Script para verificar procesos y puertos
# Ejecutar como root: sudo bash scripts/vpn/verificar-procesos.sh

echo "=========================================="
echo "VERIFICACIÓN DE PROCESOS Y PUERTOS"
echo "=========================================="
echo ""

echo "1. Procesos de Node/Next:"
echo "-------------------------"
ps aux | grep -E "node|next|npm" | grep -v grep
echo ""

echo "2. Proceso PM2 específico:"
echo "-------------------------"
pm2 describe axeso 2>/dev/null || echo "  PM2 no tiene proceso axeso"
echo ""

echo "3. Todos los puertos TCP escuchando:"
echo "------------------------------------"
ss -tlnp | head -20
echo ""

echo "4. Buscar específicamente puerto 3000:"
echo "--------------------------------------"
netstat -tlnp 2>/dev/null | grep 3000 || lsof -i:3000 2>/dev/null || echo "  No encontrado con netstat/lsof"
echo ""

echo "5. Probar conexión directa a puerto 3000:"
echo "------------------------------------------"
timeout 2 bash -c 'echo > /dev/tcp/localhost/3000' 2>/dev/null && echo "  ✓ Puerto 3000 es accesible" || echo "  ✗ Puerto 3000 NO es accesible"
echo ""

echo "6. Verificar logs de PM2:"
echo "-------------------------"
pm2 logs axeso --lines 5 --nostream 2>&1 | tail -10
echo ""

echo "7. Verificar configuración de Nginx para el dominio:"
echo "----------------------------------------------------"
grep -A 10 "visitantes.cyberpol.com.py" /home/cyberpol/conf/web/visitantes.cyberpol.com.py/nginx.ssl.conf 2>/dev/null | head -15 || echo "  No se encontró configuración"
echo ""

echo "=========================================="
echo "VERIFICACIÓN COMPLETADA"
echo "=========================================="


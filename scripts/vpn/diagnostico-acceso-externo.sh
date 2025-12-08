#!/bin/bash

# Script para diagnosticar problemas de acceso externo
# Ejecutar como root: sudo bash scripts/vpn/diagnostico-acceso-externo.sh

echo "=========================================="
echo "DIAGNÓSTICO DE ACCESO EXTERNO"
echo "=========================================="
echo ""

echo "1. Verificar que Nginx está escuchando en puerto 443:"
echo "-----------------------------------------------------"
ss -tlnp | grep 443
echo ""

echo "2. Verificar que Nginx está escuchando en puerto 80:"
echo "----------------------------------------------------"
ss -tlnp | grep ":80 "
echo ""

echo "3. Probar acceso local a Next.js:"
echo "--------------------------------"
timeout 3 curl -s http://localhost:3000/api/debug-ip | head -3 || echo "  ✗ No responde"
echo ""

echo "4. Probar acceso a través de Nginx (localhost):"
echo "----------------------------------------------"
timeout 3 curl -s -H "Host: visitantes.cyberpol.com.py" http://localhost/api/debug-ip | head -3 || echo "  ✗ No responde"
echo ""

echo "5. Probar acceso HTTPS local (puede fallar por certificado):"
echo "------------------------------------------------------------"
timeout 3 curl -s -k -H "Host: visitantes.cyberpol.com.py" https://localhost/api/debug-ip 2>&1 | head -5 || echo "  (Puede fallar por certificado)"
echo ""

echo "6. Verificar DNS del dominio:"
echo "-----------------------------"
nslookup visitantes.cyberpol.com.py 2>/dev/null || dig visitantes.cyberpol.com.py +short
echo ""

echo "7. Ver logs recientes de error de Nginx:"
echo "----------------------------------------"
tail -5 /var/log/apache2/domains/visitantes.cyberpol.com.py.error.log 2>/dev/null | tail -3 || echo "  No hay logs recientes"
echo ""

echo "8. Verificar firewall (UFW):"
echo "----------------------------"
ufw status | grep -E "80|443" || echo "  No hay reglas específicas visibles"
echo ""

echo "9. Verificar que el dominio está configurado en Nginx:"
echo "------------------------------------------------------"
nginx -T 2>&1 | grep -A 2 "server_name.*visitantes" | head -5
echo ""

echo "=========================================="
echo "DIAGNÓSTICO COMPLETADO"
echo "=========================================="
echo ""
echo "Si todo está correcto pero no puedes acceder desde fuera:"
echo "  1. Verifica que el DNS apunta a 144.202.77.18"
echo "  2. Verifica que no hay firewall bloqueando en el proveedor"
echo "  3. Prueba acceder directamente con la IP: https://144.202.77.18"
echo ""


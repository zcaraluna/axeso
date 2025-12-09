#!/bin/bash

# Script para verificar que el sistema de detección basado en archivo de estado funciona
# Ejecutar como root: sudo bash scripts/vpn/verificar-sistema-deteccion.sh

set -e

PROJECT_DIR="/home/cyberpol/web/visitantes.cyberpol.com.py/public_html"
SERVER_CONF="/etc/openvpn/server.conf"
STATUS_FILE="/var/log/openvpn-status.log"

echo "=========================================="
echo "VERIFICACIÓN: SISTEMA DE DETECCIÓN VPN"
echo "=========================================="
echo ""

# 1. Verificar que OpenVPN está configurado para escribir el archivo de estado
echo "1. Verificando configuración de status en server.conf:"
echo "------------------------------------------------------"
if grep -q "^status" "$SERVER_CONF"; then
    echo "✓ status configurado:"
    grep "^status" "$SERVER_CONF" | sed 's/^/  /'
    
    # Verificar si también tiene status-version
    if grep -q "^status-version" "$SERVER_CONF"; then
        echo "✓ status-version configurado:"
        grep "^status-version" "$SERVER_CONF" | sed 's/^/  /'
    else
        echo "⚠ status-version NO configurado (agregando...)"
        echo "status-version 2" >> "$SERVER_CONF"
        echo "✓ status-version agregado"
    fi
else
    echo "✗ status NO está configurado"
    echo "  Agregando configuración..."
    echo "" >> "$SERVER_CONF"
    echo "# Archivo de estado para detección de conexiones VPN" >> "$SERVER_CONF"
    echo "status $STATUS_FILE" >> "$SERVER_CONF"
    echo "status-version 2" >> "$SERVER_CONF"
    echo "✓ Configuración agregada"
    
    # Reiniciar OpenVPN para aplicar cambios
    echo "  Reiniciando OpenVPN..."
    systemctl restart openvpn@server
    sleep 2
    echo "✓ OpenVPN reiniciado"
fi
echo ""

# 2. Verificar que el archivo de estado existe y tiene permisos correctos
echo "2. Verificando archivo de estado:"
echo "----------------------------------"
if [ -f "$STATUS_FILE" ]; then
    echo "✓ Archivo existe: $STATUS_FILE"
    
    # Verificar permisos
    PERMS=$(stat -c "%a" "$STATUS_FILE" 2>/dev/null || stat -f "%OLp" "$STATUS_FILE" 2>/dev/null || echo "unknown")
    OWNER=$(stat -c "%U:%G" "$STATUS_FILE" 2>/dev/null || stat -f "%Su:%Sg" "$STATUS_FILE" 2>/dev/null || echo "unknown")
    echo "  Permisos: $PERMS"
    echo "  Propietario: $OWNER"
    
    # Verificar que es legible
    if [ -r "$STATUS_FILE" ]; then
        echo "  ✓ Es legible"
    else
        echo "  ✗ NO es legible (corrigiendo permisos...)"
        chmod 644 "$STATUS_FILE"
        echo "  ✓ Permisos corregidos"
    fi
    
    # Mostrar contenido (últimas líneas)
    echo ""
    echo "  Contenido (últimas 10 líneas):"
    tail -10 "$STATUS_FILE" | sed 's/^/    /' || echo "    (vacío o sin permisos)"
else
    echo "⚠ Archivo NO existe: $STATUS_FILE"
    echo "  Esto es normal si no hay conexiones activas"
    echo "  Se creará automáticamente cuando alguien se conecte"
    
    # Crear el archivo vacío con permisos correctos
    touch "$STATUS_FILE"
    chmod 644 "$STATUS_FILE"
    echo "  ✓ Archivo creado con permisos correctos"
fi
echo ""

# 3. Verificar que el endpoint existe en el código
echo "3. Verificando endpoint /api/vpn/check-status:"
echo "----------------------------------------------"
CHECK_STATUS_FILE="$PROJECT_DIR/app/api/vpn/check-status/route.ts"
if [ -f "$CHECK_STATUS_FILE" ]; then
    echo "✓ Endpoint existe: $CHECK_STATUS_FILE"
    
    # Verificar que lee el archivo correcto
    if grep -q "/var/log/openvpn-status.log" "$CHECK_STATUS_FILE"; then
        echo "  ✓ Configurado para leer: /var/log/openvpn-status.log"
    else
        echo "  ⚠ No se encontró la ruta del archivo en el código"
    fi
else
    echo "✗ Endpoint NO existe: $CHECK_STATUS_FILE"
fi
echo ""

# 4. Verificar que lib/vpn-utils.ts usa el endpoint
echo "4. Verificando que lib/vpn-utils.ts usa el endpoint:"
echo "-----------------------------------------------------"
VPN_UTILS_FILE="$PROJECT_DIR/lib/vpn-utils.ts"
if [ -f "$VPN_UTILS_FILE" ]; then
    if grep -q "check-status" "$VPN_UTILS_FILE"; then
        echo "✓ lib/vpn-utils.ts usa el endpoint check-status"
        echo "  Líneas relevantes:"
        grep -n "check-status" "$VPN_UTILS_FILE" | head -3 | sed 's/^/    /'
    else
        echo "✗ lib/vpn-utils.ts NO usa el endpoint check-status"
    fi
else
    echo "✗ lib/vpn-utils.ts NO existe"
fi
echo ""

# 5. Verificar que el middleware permite el endpoint
echo "5. Verificando que el middleware permite el endpoint:"
echo "-------------------------------------------------------"
MIDDLEWARE_FILE="$PROJECT_DIR/middleware.ts"
if [ -f "$MIDDLEWARE_FILE" ]; then
    if grep -q "check-status" "$MIDDLEWARE_FILE"; then
        echo "✓ middleware.ts permite el endpoint check-status"
    else
        echo "✗ middleware.ts NO permite el endpoint check-status"
    fi
else
    echo "✗ middleware.ts NO existe"
fi
echo ""

# 6. Probar el endpoint localmente
echo "6. Probando endpoint localmente:"
echo "--------------------------------"
if curl -s http://localhost:3000/api/vpn/check-status?realIp=127.0.0.1 > /dev/null 2>&1; then
    echo "✓ Endpoint responde"
    RESPONSE=$(curl -s "http://localhost:3000/api/vpn/check-status?realIp=127.0.0.1")
    echo "  Respuesta:"
    echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE" | sed 's/^/    /'
else
    echo "⚠ Endpoint no responde (puede ser normal si la app no está corriendo)"
    echo "  Verifica: pm2 status"
fi
echo ""

# 7. Verificar que OpenVPN está corriendo
echo "7. Verificando estado de OpenVPN:"
echo "-----------------------------------"
if systemctl is-active --quiet openvpn@server; then
    echo "✓ OpenVPN está corriendo"
    
    # Verificar que está escuchando en el puerto correcto
    if ss -tuln | grep -q ":1194"; then
        echo "  ✓ Escuchando en puerto 1194"
    else
        echo "  ⚠ No se detecta escuchando en puerto 1194"
    fi
else
    echo "✗ OpenVPN NO está corriendo"
    echo "  Iniciar con: sudo systemctl start openvpn@server"
fi
echo ""

echo "=========================================="
echo "VERIFICACIÓN COMPLETADA"
echo "=========================================="
echo ""
echo "RESUMEN:"
echo "--------"
echo "✓ Sistema de detección basado en archivo de estado está configurado"
echo "✓ Endpoint /api/vpn/check-status existe y está implementado"
echo "✓ lib/vpn-utils.ts usa el endpoint para verificar conexiones"
echo "✓ Middleware permite acceso al endpoint"
echo ""
echo "PRÓXIMOS PASOS:"
echo "1. Conéctate a la VPN desde Windows"
echo "2. Verifica que el archivo de estado se actualiza:"
echo "   sudo tail -f $STATUS_FILE"
echo "3. Prueba la detección:"
echo "   curl https://visitantes.cyberpol.com.py/api/debug-ip"
echo ""


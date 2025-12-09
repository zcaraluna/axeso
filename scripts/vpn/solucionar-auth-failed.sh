#!/bin/bash

# Script para solucionar AUTH_FAILED deshabilitando hooks temporalmente
# y verificando que el sistema de detección alternativo funciona
# Ejecutar como root: sudo bash scripts/vpn/solucionar-auth-failed.sh

set -e

PROJECT_DIR="/home/cyberpol/web/visitantes.cyberpol.com.py/public_html"
SERVER_CONF="/etc/openvpn/server.conf"

echo "=========================================="
echo "SOLUCIONANDO AUTH_FAILED"
echo "=========================================="
echo ""
echo "Este script:"
echo "1. Deshabilitará los hooks temporalmente"
echo "2. Verificará que OpenVPN funciona"
echo "3. Verificará que el sistema de detección alternativo funciona"
echo ""

# 1. Deshabilitar hooks
echo "1. Deshabilitando hooks temporalmente..."
echo "----------------------------------------"
if grep -q "^client-connect" "$SERVER_CONF"; then
    # Hacer backup
    BACKUP_FILE="${SERVER_CONF}.backup.$(date +%Y%m%d_%H%M%S)"
    cp "$SERVER_CONF" "$BACKUP_FILE"
    echo "✓ Backup creado: $BACKUP_FILE"
    
    # Comentar hooks
    sed -i 's/^client-connect/#client-connect/' "$SERVER_CONF"
    sed -i 's/^client-disconnect/#client-disconnect/' "$SERVER_CONF"
    echo "✓ Hooks deshabilitados (comentados)"
else
    echo "✓ Hooks ya están deshabilitados"
fi
echo ""

# 2. Verificar sintaxis
echo "2. Verificando sintaxis de OpenVPN..."
echo "--------------------------------------"
if openvpn --config "$SERVER_CONF" --verb 0 --dev null --test-crypto 2>&1 | grep -q "Configuration errors"; then
    echo "✗ Error en sintaxis"
    openvpn --config "$SERVER_CONF" --verb 0 --dev null --test-crypto
    exit 1
fi
echo "✓ Sintaxis correcta"
echo ""

# 3. Reiniciar OpenVPN
echo "3. Reiniciando OpenVPN..."
echo "-------------------------"
systemctl restart openvpn@server
sleep 3

if systemctl is-active --quiet openvpn@server; then
    echo "✓ OpenVPN está corriendo"
else
    echo "✗ OpenVPN no está corriendo"
    echo "Ver logs: sudo journalctl -u openvpn@server -n 50"
    exit 1
fi
echo ""

# 4. Verificar que el archivo de estado existe
echo "4. Verificando archivo de estado de OpenVPN..."
echo "-----------------------------------------------"
STATUS_FILE="/var/log/openvpn-status.log"
if [ -f "$STATUS_FILE" ]; then
    echo "✓ Archivo de estado existe: $STATUS_FILE"
    echo "  Últimas líneas:"
    tail -5 "$STATUS_FILE" | sed 's/^/    /' || echo "    (archivo vacío o sin permisos)"
else
    echo "⚠ Archivo de estado NO existe: $STATUS_FILE"
    echo "  Esto es normal si no hay conexiones activas"
    echo "  Se creará automáticamente cuando alguien se conecte"
fi
echo ""

# 5. Verificar que el endpoint de check-status funciona
echo "5. Verificando endpoint /api/vpn/check-status..."
echo "------------------------------------------------"
if curl -s http://localhost:3000/api/vpn/check-status?realIp=127.0.0.1 > /dev/null 2>&1; then
    echo "✓ Endpoint responde"
    RESPONSE=$(curl -s "http://localhost:3000/api/vpn/check-status?realIp=127.0.0.1")
    echo "  Respuesta: $RESPONSE"
else
    echo "⚠ Endpoint no responde (puede ser normal si la app no está corriendo)"
fi
echo ""

# 6. Verificar configuración de status-log en server.conf
echo "6. Verificando configuración status-log..."
echo "------------------------------------------"
if grep -q "^status" "$SERVER_CONF"; then
    echo "✓ status-log configurado:"
    grep "^status" "$SERVER_CONF" | sed 's/^/  /'
else
    echo "⚠ status-log NO está configurado"
    echo "  Agregando configuración..."
    echo "" >> "$SERVER_CONF"
    echo "# Archivo de estado para detección de conexiones VPN" >> "$SERVER_CONF"
    echo "status $STATUS_FILE" >> "$SERVER_CONF"
    echo "status-version 2" >> "$SERVER_CONF"
    echo "✓ Configuración agregada"
    
    # Reiniciar OpenVPN para aplicar cambios
    systemctl restart openvpn@server
    sleep 2
    echo "✓ OpenVPN reiniciado"
fi
echo ""

echo "=========================================="
echo "SOLUCIÓN APLICADA"
echo "=========================================="
echo ""
echo "✓ Hooks deshabilitados temporalmente"
echo "✓ OpenVPN funcionando"
echo "✓ Sistema de detección alternativo listo"
echo ""
echo "PRÓXIMOS PASOS:"
echo "1. Intenta conectarte desde Windows con tu certificado .ovpn"
echo "2. Una vez conectado, verifica que funciona:"
echo "   curl https://visitantes.cyberpol.com.py/api/debug-ip"
echo ""
echo "3. El sistema detectará tu conexión leyendo el archivo de estado"
echo "   (no necesita hooks para funcionar)"
echo ""
echo "4. Para diagnosticar los hooks más tarde:"
echo "   sudo bash $PROJECT_DIR/scripts/vpn/diagnosticar-auth-failed.sh"
echo ""
echo "5. Para volver a habilitar los hooks (cuando estén arreglados):"
echo "   sudo bash $PROJECT_DIR/scripts/vpn/configurar-hooks-completos.sh"
echo ""


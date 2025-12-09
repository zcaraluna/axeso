#!/bin/bash

# Script para corregir permisos del archivo de estado y probar el sistema
# Ejecutar como root: sudo bash scripts/vpn/corregir-permisos-y-probar.sh

set -e

PROJECT_DIR="/home/cyberpol/web/visitantes.cyberpol.com.py/public_html"
STATUS_FILE="/var/log/openvpn-status.log"

echo "=========================================="
echo "CORRECCIÓN: PERMISOS Y PRUEBA"
echo "=========================================="
echo ""

# 1. Corregir permisos del archivo de estado
echo "1. Corrigiendo permisos del archivo de estado:"
echo "----------------------------------------------"
if [ -f "$STATUS_FILE" ]; then
    # Cambiar permisos a 644 (lectura para todos, escritura solo para root)
    chmod 644 "$STATUS_FILE"
    echo "✓ Permisos cambiados a 644"
    
    # Verificar
    PERMS=$(stat -c "%a" "$STATUS_FILE" 2>/dev/null || stat -f "%OLp" "$STATUS_FILE" 2>/dev/null || echo "unknown")
    echo "  Permisos actuales: $PERMS"
    
    # Verificar que es legible
    if [ -r "$STATUS_FILE" ]; then
        echo "  ✓ Es legible"
    else
        echo "  ✗ Aún no es legible"
    fi
else
    echo "⚠ Archivo no existe, se creará cuando alguien se conecte"
    touch "$STATUS_FILE"
    chmod 644 "$STATUS_FILE"
    echo "✓ Archivo creado con permisos correctos"
fi
echo ""

# 2. Verificar que PM2 está corriendo
echo "2. Verificando estado de PM2:"
echo "------------------------------"
if command -v pm2 &> /dev/null; then
    PM2_STATUS=$(pm2 status 2>&1 || echo "error")
    if echo "$PM2_STATUS" | grep -q "online"; then
        echo "✓ PM2 tiene procesos online"
        echo "$PM2_STATUS" | grep -E "name|status" | head -5
    else
        echo "⚠ PM2 no tiene procesos online"
        echo "  Iniciar con: cd $PROJECT_DIR && pm2 start ecosystem.config.js"
    fi
else
    echo "⚠ PM2 no está instalado o no está en PATH"
fi
echo ""

# 3. Verificar que la app responde
echo "3. Verificando que la app responde:"
echo "------------------------------------"
# Probar con timeout más corto y sin redirección
if timeout 3 curl -s http://localhost:3000/api/debug-ip > /dev/null 2>&1; then
    echo "✓ App responde en localhost:3000"
    
    # Probar el endpoint de check-status
    echo ""
    echo "4. Probando endpoint /api/vpn/check-status:"
    echo "--------------------------------------------"
    RESPONSE=$(timeout 3 curl -s "http://localhost:3000/api/vpn/check-status?realIp=127.0.0.1" 2>&1 || echo "timeout")
    
    if echo "$RESPONSE" | grep -q "isActive"; then
        echo "✓ Endpoint responde correctamente"
        echo "  Respuesta:"
        echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE" | sed 's/^/    /'
    elif echo "$RESPONSE" | grep -q "timeout\|Killed"; then
        echo "⚠ Endpoint no responde (timeout o falta de memoria)"
        echo "  Esto puede ser normal si la app está recargando"
    else
        echo "⚠ Respuesta inesperada:"
        echo "$RESPONSE" | head -5 | sed 's/^/    /'
    fi
else
    echo "⚠ App NO responde en localhost:3000"
    echo "  Verificar: pm2 status"
    echo "  Reiniciar: pm2 restart axeso"
fi
echo ""

# 5. Verificar que OpenVPN está escuchando
echo "5. Verificando que OpenVPN está escuchando:"
echo "--------------------------------------------"
if ss -tuln 2>/dev/null | grep -q ":1194"; then
    echo "✓ OpenVPN está escuchando en puerto 1194"
    ss -tuln | grep ":1194" | sed 's/^/  /'
elif netstat -tuln 2>/dev/null | grep -q ":1194"; then
    echo "✓ OpenVPN está escuchando en puerto 1194"
    netstat -tuln | grep ":1194" | sed 's/^/  /'
else
    echo "⚠ OpenVPN NO se detecta escuchando en puerto 1194"
    echo "  Verificar logs: sudo journalctl -u openvpn@server -n 20"
    echo "  Verificar configuración: grep -E '^port|^proto' /etc/openvpn/server.conf"
fi
echo ""

# 6. Verificar contenido del archivo de estado
echo "6. Contenido actual del archivo de estado:"
echo "--------------------------------------------"
if [ -f "$STATUS_FILE" ] && [ -r "$STATUS_FILE" ]; then
    echo "Últimas 15 líneas:"
    tail -15 "$STATUS_FILE" | sed 's/^/  /'
    
    # Contar conexiones activas
    ACTIVE_CONNECTIONS=$(grep -v "^#" "$STATUS_FILE" | grep -v "^CLIENT LIST" | grep -v "^ROUTING TABLE" | grep -v "^GLOBAL STATS" | grep -v "^Updated" | grep -v "^END" | grep -v "^$" | wc -l)
    if [ "$ACTIVE_CONNECTIONS" -gt 0 ]; then
        echo ""
        echo "  ✓ Hay $ACTIVE_CONNECTIONS conexión(es) activa(s)"
    else
        echo ""
        echo "  ℹ No hay conexiones activas (normal si nadie está conectado)"
    fi
else
    echo "⚠ No se puede leer el archivo de estado"
fi
echo ""

echo "=========================================="
echo "CORRECCIÓN COMPLETADA"
echo "=========================================="
echo ""
echo "RESUMEN:"
echo "--------"
echo "✓ Permisos del archivo de estado corregidos (644)"
echo "✓ Sistema de detección configurado"
echo ""
echo "PRÓXIMOS PASOS:"
echo "1. Si la app no responde, reiníciala:"
echo "   pm2 restart axeso"
echo ""
echo "2. Conéctate a la VPN desde Windows"
echo ""
echo "3. Mientras estás conectado, verifica el archivo de estado:"
echo "   sudo tail -f $STATUS_FILE"
echo ""
echo "4. Prueba la detección desde tu navegador:"
echo "   https://visitantes.cyberpol.com.py/api/debug-ip"
echo ""


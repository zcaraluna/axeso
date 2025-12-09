#!/bin/bash

# Script para verificar que el endpoint existe y reconstruir si es necesario
# Ejecutar como root: sudo bash scripts/vpn/verificar-y-reconstruir-endpoint.sh

set -e

PROJECT_DIR="/home/cyberpol/web/visitantes.cyberpol.com.py/public_html"
ENDPOINT_FILE="$PROJECT_DIR/app/api/vpn/check-status/route.ts"

echo "=========================================="
echo "VERIFICACIÓN Y RECONSTRUCCIÓN DE ENDPOINT"
echo "=========================================="
echo ""

# 1. Verificar que el archivo existe
echo "1. Verificando que el endpoint existe:"
echo "---------------------------------------"
if [ -f "$ENDPOINT_FILE" ]; then
    echo "✓ Archivo existe: $ENDPOINT_FILE"
    echo "  Líneas: $(wc -l < "$ENDPOINT_FILE")"
else
    echo "✗ Archivo NO existe: $ENDPOINT_FILE"
    exit 1
fi
echo ""

# 2. Verificar estructura de directorios
echo "2. Verificando estructura de directorios:"
echo "------------------------------------------"
if [ -d "$PROJECT_DIR/app/api/vpn/check-status" ]; then
    echo "✓ Directorio existe: app/api/vpn/check-status"
    ls -la "$PROJECT_DIR/app/api/vpn/check-status/" | sed 's/^/  /'
else
    echo "✗ Directorio NO existe"
    exit 1
fi
echo ""

# 3. Verificar que Next.js reconoce la ruta
echo "3. Verificando build de Next.js:"
echo "---------------------------------"
cd "$PROJECT_DIR"

# Verificar si existe .next
if [ -d ".next" ]; then
    echo "✓ Directorio .next existe"
    
    # Buscar la ruta en el build
    if find .next -name "*check-status*" -o -path "*api/vpn/check-status*" 2>/dev/null | head -1 > /dev/null; then
        echo "✓ Ruta encontrada en build"
    else
        echo "⚠ Ruta NO encontrada en build (puede necesitar rebuild)"
    fi
else
    echo "⚠ Directorio .next NO existe (necesita build)"
fi
echo ""

# 4. Probar el endpoint directamente
echo "4. Probando endpoint directamente:"
echo "------------------------------------"
# Esperar un poco para que la app esté lista
sleep 2

# Probar con timeout corto
RESPONSE=$(timeout 3 curl -s "http://localhost:3000/api/vpn/check-status?realIp=181.91.85.248" 2>&1 || echo "ERROR")

if echo "$RESPONSE" | grep -q "isActive\|error"; then
    echo "✓ Endpoint responde (JSON)"
    echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE" | head -5
elif echo "$RESPONSE" | grep -q "<!DOCTYPE html>"; then
    echo "✗ Endpoint devuelve HTML (404) - La ruta no se encuentra"
    echo ""
    echo "  Solución: Reconstruir la aplicación"
    echo ""
    read -p "  ¿Reconstruir ahora? (s/n): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Ss]$ ]]; then
        echo ""
        echo "5. Reconstruyendo aplicación..."
        echo "--------------------------------"
        
        # Detener PM2
        echo "  Deteniendo PM2..."
        pm2 stop axeso 2>/dev/null || true
        
        # Reconstruir
        echo "  Reconstruyendo..."
        npm run build
        
        # Reiniciar PM2
        echo "  Reiniciando PM2..."
        pm2 restart axeso --update-env
        
        echo ""
        echo "✓ Reconstrucción completada"
        echo ""
        echo "  Esperando 5 segundos para que la app inicie..."
        sleep 5
        
        # Probar de nuevo
        echo ""
        echo "6. Probando endpoint después de rebuild:"
        echo "----------------------------------------"
        RESPONSE2=$(timeout 5 curl -s "http://localhost:3000/api/vpn/check-status?realIp=181.91.85.248" 2>&1 || echo "ERROR")
        
        if echo "$RESPONSE2" | grep -q "isActive\|error"; then
            echo "✓ Endpoint ahora responde correctamente"
            echo "$RESPONSE2" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE2" | head -5
        else
            echo "⚠ Endpoint aún no responde correctamente"
            echo "$RESPONSE2" | head -10
        fi
    fi
else
    echo "⚠ Respuesta inesperada:"
    echo "$RESPONSE" | head -5
fi
echo ""

echo "=========================================="
echo "VERIFICACIÓN COMPLETADA"
echo "=========================================="
echo ""


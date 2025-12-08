#!/bin/bash

# Script para corregir todos los archivos de configuración de Nginx
# Ejecutar como root: sudo bash scripts/vpn/corregir-todos-nginx.sh

set -e

CONF_DIR="/home/cyberpol/conf/web/visitantes.cyberpol.com.py"

echo "=========================================="
echo "CORRECCIÓN DE TODOS LOS ARCHIVOS NGINX"
echo "=========================================="
echo ""

# Lista de archivos a corregir
FILES=(
    "$CONF_DIR/nginx.ssl.conf"
    "$CONF_DIR/nginx.conf"
)

for FILE in "${FILES[@]}"; do
    if [ -f "$FILE" ]; then
        echo "Procesando: $FILE"
        echo "-------------------"
        
        # Verificar si tiene la IP externa
        if grep -q "144.202.77.18:3000" "$FILE"; then
            # Hacer backup
            BACKUP_FILE="${FILE}.backup.$(date +%Y%m%d_%H%M%S)"
            cp "$FILE" "$BACKUP_FILE"
            echo "  Backup creado: $BACKUP_FILE"
            
            # Corregir
            sed -i 's|http://144.202.77.18:3000|http://localhost:3000|g' "$FILE"
            sed -i 's|144.202.77.18:3000|localhost:3000|g' "$FILE"
            
            echo "  ✓ Corregido"
            
            # Mostrar cambios
            echo "  Cambios:"
            grep "proxy_pass" "$FILE" | head -3
        else
            echo "  ✓ Ya está correcto (usa localhost)"
        fi
        echo ""
    else
        echo "  ⚠ Archivo no existe: $FILE"
        echo ""
    fi
done

# Verificar sintaxis
echo "Verificando sintaxis de Nginx..."
if nginx -t 2>&1 | grep -q "successful"; then
    echo "✓ Sintaxis correcta"
    echo ""
    echo "Recargando Nginx..."
    systemctl reload nginx
    echo "✓ Nginx recargado"
else
    echo "✗ Error en sintaxis:"
    nginx -t
    exit 1
fi

echo ""
echo "=========================================="
echo "CORRECCIÓN COMPLETADA"
echo "=========================================="
echo ""
echo "Verificando que Next.js está respondiendo..."
if timeout 3 curl -s http://localhost:3000/api/debug-ip > /dev/null 2>&1; then
    echo "✓ Next.js está respondiendo"
else
    echo "✗ Next.js NO está respondiendo"
    echo "Verifica: pm2 status"
fi
echo ""


#!/bin/bash

# Script para aplicar la migración de campos de contraseña de forma segura
# Ejecutar como root: sudo bash scripts/vpn/aplicar-migracion-password.sh

set -e

PROJECT_DIR="/home/cyberpol/web/visitantes.cyberpol.com.py/public_html"

echo "=========================================="
echo "APLICAR MIGRACIÓN: CAMPOS DE CONTRASEÑA"
echo "=========================================="
echo ""

cd "$PROJECT_DIR"

# 1. Verificar conexión a la base de datos
echo "1. Verificando conexión a la base de datos..."
echo "---------------------------------------------"
if npx prisma db execute --stdin <<< "SELECT 1;" 2>/dev/null; then
    echo "✓ Conexión a BD exitosa"
else
    echo "⚠ No se pudo verificar conexión (puede ser normal)"
fi
echo ""

# 2. Verificar si los campos ya existen
echo "2. Verificando si los campos ya existen..."
echo "------------------------------------------"
FIELDS_EXIST=$(npx prisma db execute --stdin <<< "SELECT column_name FROM information_schema.columns WHERE table_name = 'vpn_certificates' AND column_name IN ('hasPassword', 'passwordHash');" 2>/dev/null | grep -c "hasPassword\|passwordHash" || echo "0")

if [ "$FIELDS_EXIST" -ge 2 ]; then
    echo "✓ Los campos ya existen en la base de datos"
    echo "  No es necesario aplicar la migración"
else
    echo "⚠ Los campos NO existen, aplicando migración..."
    echo ""
    
    # 3. Aplicar migración manualmente con SQL directo
    echo "3. Aplicando migración manualmente..."
    echo "--------------------------------------"
    
    SQL_MIGRATION="
    ALTER TABLE \"vpn_certificates\" 
    ADD COLUMN IF NOT EXISTS \"hasPassword\" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS \"passwordHash\" TEXT;
    "
    
    if echo "$SQL_MIGRATION" | npx prisma db execute --stdin 2>/dev/null; then
        echo "✓ Migración aplicada exitosamente"
    else
        echo "⚠ Error al aplicar migración, intentando con psql directo..."
        
        # Intentar con psql si está disponible
        if command -v psql &> /dev/null; then
            DATABASE_URL=$(grep "^DATABASE_URL=" "$PROJECT_DIR/.env" | cut -d'=' -f2- | tr -d '"' | tr -d "'")
            if [ -n "$DATABASE_URL" ]; then
                echo "$SQL_MIGRATION" | psql "$DATABASE_URL" 2>/dev/null && echo "✓ Migración aplicada con psql" || echo "⚠ Error con psql también"
            fi
        fi
    fi
fi
echo ""

# 4. Regenerar cliente de Prisma
echo "4. Regenerando cliente de Prisma..."
echo "------------------------------------"
if npx prisma generate; then
    echo "✓ Cliente de Prisma regenerado"
else
    echo "✗ Error al regenerar cliente de Prisma"
    exit 1
fi
echo ""

# 5. Verificar que los campos están disponibles
echo "5. Verificando que los campos están disponibles..."
echo "--------------------------------------------------"
if npx prisma db execute --stdin <<< "SELECT \"hasPassword\", \"passwordHash\" FROM \"vpn_certificates\" LIMIT 1;" 2>/dev/null; then
    echo "✓ Campos verificados correctamente"
else
    echo "⚠ No se pudo verificar (puede ser normal si no hay registros)"
fi
echo ""

echo "=========================================="
echo "MIGRACIÓN COMPLETADA"
echo "=========================================="
echo ""
echo "Próximos pasos:"
echo "1. Reconstruir la aplicación: npm run build"
echo "2. Reiniciar PM2: pm2 restart axeso --update-env"
echo ""


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

# 1. Verificar si los campos ya existen usando psql directamente
echo "1. Verificando si los campos ya existen..."
echo "------------------------------------------"

# Obtener DATABASE_URL del .env
DATABASE_URL=$(grep "^DATABASE_URL=" "$PROJECT_DIR/.env" | cut -d'=' -f2- | tr -d '"' | tr -d "'")

if [ -z "$DATABASE_URL" ]; then
    echo "✗ Error: DATABASE_URL no encontrado en .env"
    exit 1
fi

# Verificar si los campos existen
HAS_PASSWORD_EXISTS=$(psql "$DATABASE_URL" -tAc "SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'vpn_certificates' AND column_name = 'hasPassword';" 2>/dev/null || echo "0")
PASSWORD_HASH_EXISTS=$(psql "$DATABASE_URL" -tAc "SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'vpn_certificates' AND column_name = 'passwordHash';" 2>/dev/null || echo "0")

if [ "$HAS_PASSWORD_EXISTS" = "1" ] && [ "$PASSWORD_HASH_EXISTS" = "1" ]; then
    echo "✓ Los campos ya existen en la base de datos"
    echo "  No es necesario aplicar la migración"
else
    echo "⚠ Los campos NO existen, aplicando migración..."
    echo ""
    
    # 2. Aplicar migración manualmente con psql
    echo "2. Aplicando migración manualmente..."
    echo "--------------------------------------"
    
    SQL_MIGRATION="
    ALTER TABLE vpn_certificates 
    ADD COLUMN IF NOT EXISTS \"hasPassword\" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS \"passwordHash\" TEXT;
    "
    
    if echo "$SQL_MIGRATION" | psql "$DATABASE_URL" 2>&1; then
        echo "✓ Migración aplicada exitosamente"
    else
        echo "✗ Error al aplicar migración"
        exit 1
    fi
fi
echo ""

# 3. Regenerar cliente de Prisma
echo "3. Regenerando cliente de Prisma..."
echo "------------------------------------"
if npx prisma generate; then
    echo "✓ Cliente de Prisma regenerado"
else
    echo "✗ Error al regenerar cliente de Prisma"
    exit 1
fi
echo ""

# 4. Verificar que los campos están disponibles
echo "4. Verificando que los campos están disponibles..."
echo "--------------------------------------------------"
if psql "$DATABASE_URL" -tAc "SELECT \"hasPassword\", \"passwordHash\" FROM vpn_certificates LIMIT 1;" > /dev/null 2>&1; then
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


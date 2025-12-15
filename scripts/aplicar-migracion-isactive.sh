#!/bin/bash

# Script para aplicar la migración de isActive sin resetear la base de datos
# Ejecutar en el servidor: sudo bash scripts/aplicar-migracion-isactive.sh

set -e

echo "=========================================="
echo "APLICAR MIGRACIÓN: isActive"
echo "=========================================="
echo ""

# Cargar variables de entorno
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

DATABASE_URL="${DATABASE_URL:-postgresql://postgres:admin123@localhost:5432/controldeacceso}"

# 1. Verificar si el campo ya existe
echo "1. Verificando si el campo isActive ya existe..."
echo "------------------------------------------------"

if psql "$DATABASE_URL" -tAc "SELECT column_name FROM information_schema.columns WHERE table_name='users' AND column_name='isActive';" | grep -q "isActive"; then
    echo "✓ El campo isActive ya existe en la base de datos"
    FIELD_EXISTS=true
else
    echo "⚠ El campo isActive NO existe, se agregará"
    FIELD_EXISTS=false
fi
echo ""

# 2. Aplicar migración solo si no existe
if [ "$FIELD_EXISTS" = false ]; then
    echo "2. Aplicando migración..."
    echo "------------------------"
    
    SQL_MIGRATION="
    ALTER TABLE users 
    ADD COLUMN IF NOT EXISTS \"isActive\" BOOLEAN NOT NULL DEFAULT true;
    "
    
    if echo "$SQL_MIGRATION" | psql "$DATABASE_URL" 2>&1; then
        echo "✓ Migración aplicada exitosamente"
    else
        echo "✗ Error al aplicar migración"
        exit 1
    fi
else
    echo "2. No es necesario aplicar la migración (el campo ya existe)"
fi
echo ""

# 3. Marcar la migración como aplicada en Prisma
echo "3. Marcando migración como aplicada en Prisma..."
echo "-------------------------------------------------"

MIGRATION_NAME="20251215230015_add_user_is_active"

if npx prisma migrate resolve --applied "$MIGRATION_NAME" 2>&1; then
    echo "✓ Migración marcada como aplicada"
else
    echo "⚠ No se pudo marcar como aplicada (puede que ya esté marcada)"
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

# 5. Verificar que el campo está disponible
echo "5. Verificando que el campo está disponible..."
echo "----------------------------------------------"
if psql "$DATABASE_URL" -tAc "SELECT \"isActive\" FROM users LIMIT 1;" > /dev/null 2>&1; then
    echo "✓ Campo verificado correctamente"
    
    # Mostrar algunos valores
    echo ""
    echo "Valores actuales de isActive:"
    psql "$DATABASE_URL" -tAc "SELECT username, \"isActive\" FROM users LIMIT 5;" | sed 's/^/  /'
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


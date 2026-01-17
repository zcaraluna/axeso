#!/bin/bash

# Script completo para migrar a NeonDB usando Prisma
# Uso: ./scripts/migrate-to-neondb-complete.sh

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🚀 Migración Completa a NeonDB${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Verificar que estamos en el directorio del proyecto
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ No se encontró package.json. Ejecuta desde la raíz del proyecto.${NC}"
    exit 1
fi

# Solicitar connection string
read -p "Connection string de NeonDB: " NEONDB_URL

# Exportar DATABASE_URL temporalmente
export DATABASE_URL="$NEONDB_URL"

echo ""
echo -e "${YELLOW}📋 Paso 1: Aplicando schema con Prisma...${NC}"
npx prisma migrate deploy

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Error al aplicar migraciones${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}✅ Schema aplicado correctamente${NC}"

echo ""
echo -e "${YELLOW}📋 Paso 2: Regenerando Prisma Client...${NC}"
npx prisma generate

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Configuración de Prisma completada${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "Ahora necesitas importar los datos del backup."
echo ""
echo "Si tienes pg_restore instalado, ejecuta:"
echo ""
echo "  pg_restore -d \"$NEONDB_URL\" \\"
echo "    --no-owner --no-privileges --data-only \\"
echo "    backup_neondb_20260107_021552.dump"
echo ""
echo "O si prefieres, puedes usar el script de importación:"
echo "  ./scripts/import-to-neondb.sh"
echo ""


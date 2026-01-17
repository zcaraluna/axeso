#!/bin/bash

# Script para importar backup a NeonDB
# Uso: ./scripts/import-to-neondb.sh

set -e

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}📥 Importación de Backup a NeonDB${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Verificar que pg_restore está instalado
if ! command -v pg_restore &> /dev/null; then
    echo -e "${RED}❌ pg_restore no encontrado${NC}"
    echo ""
    echo "Instala PostgreSQL client:"
    echo "  Ubuntu/Debian: sudo apt install postgresql-client"
    echo "  O instala PostgreSQL completo desde postgresql.org"
    exit 1
fi

# Solicitar connection string
read -p "Connection string de NeonDB: " NEONDB_URL

# Solicitar archivo de backup
read -p "Ruta del archivo .dump: " BACKUP_FILE

# Verificar que el archivo existe
if [ ! -f "$BACKUP_FILE" ]; then
    echo -e "${RED}❌ Archivo no encontrado: $BACKUP_FILE${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}🔄 Importando backup a NeonDB...${NC}"
echo ""

# Importar el backup
pg_restore -d "$NEONDB_URL" \
  --no-owner \
  --no-privileges \
  --verbose \
  "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}✅ Importación completada exitosamente${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo "Próximos pasos:"
    echo "1. Verifica los datos en NeonDB dashboard"
    echo "2. Actualiza DATABASE_URL en Vercel"
    echo "3. Haz un nuevo deploy"
else
    echo ""
    echo -e "${RED}❌ Error durante la importación${NC}"
    exit 1
fi


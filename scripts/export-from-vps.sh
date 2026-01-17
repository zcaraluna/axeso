#!/bin/bash

# Script simplificado para exportar la base de datos desde el VPS
# Uso: ./scripts/export-from-vps.sh
# O ejecutar directamente en el VPS

set -e

# Credenciales de la base de datos (según lo proporcionado)
DB_USER="postgres"
DB_NAME="controldeacceso"
DB_PASSWORD="admin123"

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}📦 Exportación de Base de Datos para NeonDB${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Verificar si estamos en el VPS o localmente
if command -v pg_dump &> /dev/null; then
    echo -e "${GREEN}✓${NC} pg_dump encontrado"
else
    echo -e "${YELLOW}⚠${NC} pg_dump no encontrado. Este script debe ejecutarse en el VPS."
    exit 1
fi

# Directorio para el backup
BACKUP_DIR="$HOME/backups_neondb"
mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE_CUSTOM="${BACKUP_DIR}/backup_neondb_${TIMESTAMP}.dump"
BACKUP_FILE_SQL="${BACKUP_DIR}/backup_neondb_${TIMESTAMP}.sql"

echo "📋 Información de la base de datos:"
echo "   Usuario: ${DB_USER}"
echo "   Base de datos: ${DB_NAME}"
echo "   Formato de backup: Custom (.dump) y SQL (.sql)"
echo ""

# Exportar en formato custom (recomendado)
echo "🔄 Creando backup en formato custom..."
export PGPASSWORD="${DB_PASSWORD}"

# Usar -h localhost para evitar problemas de autenticación peer
if pg_dump -h localhost -U "${DB_USER}" -d "${DB_NAME}" -F c -f "${BACKUP_FILE_CUSTOM}" 2>/dev/null; then
    echo "   ✓ Backup custom creado con conexión TCP"
elif sudo -u "${DB_USER}" pg_dump -d "${DB_NAME}" -F c -f "${BACKUP_FILE_CUSTOM}" 2>/dev/null; then
    echo "   ✓ Backup custom creado como usuario ${DB_USER}"
    # Mover el archivo al directorio correcto si fue creado en otro lugar
    if [ -f "/home/${DB_USER}/${BACKUP_FILE_CUSTOM}" ]; then
        mv "/home/${DB_USER}/${BACKUP_FILE_CUSTOM}" "${BACKUP_FILE_CUSTOM}"
    fi
else
    # Último intento sin -h localhost
    pg_dump -U "${DB_USER}" -d "${DB_NAME}" -F c -f "${BACKUP_FILE_CUSTOM}"
fi

if [ $? -eq 0 ]; then
    CUSTOM_SIZE=$(ls -lh "${BACKUP_FILE_CUSTOM}" | awk '{print $5}')
    echo -e "${GREEN}✓${NC} Backup custom creado: ${BACKUP_FILE_CUSTOM} (${CUSTOM_SIZE})"
else
    echo "❌ Error al crear backup custom"
    exit 1
fi

# Exportar en formato SQL (alternativa)
echo ""
echo "🔄 Creando backup en formato SQL..."

if pg_dump -h localhost -U "${DB_USER}" -d "${DB_NAME}" > "${BACKUP_FILE_SQL}" 2>/dev/null; then
    echo "   ✓ Backup SQL creado con conexión TCP"
elif sudo -u "${DB_USER}" pg_dump -d "${DB_NAME}" > "${BACKUP_FILE_SQL}" 2>/dev/null; then
    echo "   ✓ Backup SQL creado como usuario ${DB_USER}"
    # Mover el archivo al directorio correcto si fue creado en otro lugar
    if [ -f "/home/${DB_USER}/${BACKUP_FILE_SQL}" ]; then
        mv "/home/${DB_USER}/${BACKUP_FILE_SQL}" "${BACKUP_FILE_SQL}"
    fi
else
    # Último intento sin -h localhost
    pg_dump -U "${DB_USER}" -d "${DB_NAME}" > "${BACKUP_FILE_SQL}"
fi

if [ $? -eq 0 ]; then
    SQL_SIZE=$(ls -lh "${BACKUP_FILE_SQL}" | awk '{print $5}')
    echo -e "${GREEN}✓${NC} Backup SQL creado: ${BACKUP_FILE_SQL} (${SQL_SIZE})"
else
    echo "❌ Error al crear backup SQL"
    exit 1
fi

unset PGPASSWORD

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Exportación completada exitosamente${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "📁 Archivos de backup creados en: ${BACKUP_DIR}"
echo ""
echo "📥 Para descargar a tu máquina local, ejecuta desde tu PC:"
echo ""
echo "   scp usuario@tu-vps:${BACKUP_DIR}/backup_neondb_${TIMESTAMP}.dump ./"
echo "   # o"
echo "   scp usuario@tu-vps:${BACKUP_DIR}/backup_neondb_${TIMESTAMP}.sql ./"
echo ""
echo "💡 Luego sigue los pasos en MIGRACION_NEONDB.md para importar a NeonDB"
echo ""


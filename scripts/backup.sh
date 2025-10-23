#!/bin/bash

# Script de backup para base de datos PostgreSQL
# Uso: ./scripts/backup.sh

set -e

# Configuración
DB_NAME="controldeacceso"
DB_USER="controldeacceso"
BACKUP_DIR="/var/backups/axeso"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="axeso_backup_${DATE}.sql"

# Colores
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Crear directorio de backup si no existe
mkdir -p $BACKUP_DIR

print_status "Iniciando backup de base de datos..."

# Crear backup
pg_dump -U $DB_USER -h localhost $DB_NAME > $BACKUP_DIR/$BACKUP_FILE

if [ $? -eq 0 ]; then
    print_status "Backup creado exitosamente: $BACKUP_DIR/$BACKUP_FILE"
    
    # Comprimir backup
    gzip $BACKUP_DIR/$BACKUP_FILE
    print_status "Backup comprimido: $BACKUP_DIR/${BACKUP_FILE}.gz"
    
    # Mantener solo los últimos 7 backups
    find $BACKUP_DIR -name "axeso_backup_*.sql.gz" -mtime +7 -delete
    print_status "Backups antiguos eliminados (más de 7 días)"
    
else
    print_error "Error al crear backup"
    exit 1
fi

print_status "✅ Backup completado exitosamente"

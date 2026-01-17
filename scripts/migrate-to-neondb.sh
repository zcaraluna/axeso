#!/bin/bash

# Script para facilitar la migración de base de datos del VPS a NeonDB
# Uso: ./scripts/migrate-to-neondb.sh

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Funciones para imprimir mensajes
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[⚠]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

print_section() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
}

# Verificar que estamos en el directorio correcto
if [ ! -f "package.json" ]; then
    print_error "No se encontró package.json. Ejecutar desde la raíz del proyecto."
    exit 1
fi

print_section "🔧 Migración de Base de Datos: VPS → NeonDB"

echo "Este script te ayudará a exportar los datos del VPS."
echo "Para la importación a NeonDB, sigue los pasos en MIGRACION_NEONDB.md"
echo ""

# Paso 1: Información del VPS
print_section "Paso 1: Información del VPS"

read -p "Usuario SSH del VPS: " VPS_USER
read -p "Host/IP del VPS: " VPS_HOST
read -p "Usuario de PostgreSQL (default: postgres): " DB_USER
DB_USER=${DB_USER:-postgres}
read -p "Nombre de la base de datos (default: controldeacceso): " DB_NAME
DB_NAME=${DB_NAME:-controldeacceso}
read -p "Ruta donde guardar el backup en el VPS (default: ~/): " BACKUP_PATH
BACKUP_PATH=${BACKUP_PATH:-~}

# Paso 2: Opciones de exportación
print_section "Paso 2: Formato de Exportación"

echo "¿En qué formato quieres exportar el backup?"
echo "1) Formato custom (recomendado, más rápido y flexible)"
echo "2) Formato SQL (texto plano, más compatible)"
read -p "Elige una opción (1 o 2): " EXPORT_FORMAT

TIMESTAMP=$(date +%Y%m%d_%H%M%S)

if [ "$EXPORT_FORMAT" = "1" ]; then
    BACKUP_FILE="backup_neondb_${TIMESTAMP}.dump"
    EXPORT_CMD="pg_dump -U ${DB_USER} -d ${DB_NAME} -F c -f ${BACKUP_PATH}/${BACKUP_FILE}"
    print_info "Formato elegido: Custom (.dump)"
else
    BACKUP_FILE="backup_neondb_${TIMESTAMP}.sql"
    EXPORT_CMD="pg_dump -U ${DB_USER} -d ${DB_NAME} > ${BACKUP_PATH}/${BACKUP_FILE}"
    print_info "Formato elegido: SQL (.sql)"
fi

# Paso 3: Confirmación
print_section "Paso 3: Confirmación"

echo "Resumen de la exportación:"
echo "  VPS: ${VPS_USER}@${VPS_HOST}"
echo "  Base de datos: ${DB_NAME}"
echo "  Usuario DB: ${DB_USER}"
echo "  Archivo de backup: ${BACKUP_FILE}"
echo "  Ubicación en VPS: ${BACKUP_PATH}/${BACKUP_FILE}"
echo ""

read -p "¿Continuar con la exportación? (s/N): " CONFIRM

if [[ ! "$CONFIRM" =~ ^[Ss]$ ]]; then
    print_warning "Exportación cancelada."
    exit 0
fi

# Paso 4: Exportar
print_section "Paso 4: Exportando Base de Datos"

print_info "Conectando a ${VPS_USER}@${VPS_HOST}..."

# Crear el comando SSH completo
SSH_CMD="ssh ${VPS_USER}@${VPS_HOST}"

# Verificar conexión
if ! $SSH_CMD "echo 'Conexión exitosa'" > /dev/null 2>&1; then
    print_error "No se pudo conectar al VPS. Verifica las credenciales."
    exit 1
fi

print_success "Conexión establecida"

# Ejecutar el backup
print_info "Exportando base de datos... (esto puede tardar varios minutos)"

if $SSH_CMD "$EXPORT_CMD"; then
    print_success "Backup creado exitosamente en el VPS"
else
    print_error "Error al crear el backup. Verifica las credenciales de PostgreSQL."
    exit 1
fi

# Verificar el tamaño del archivo
print_info "Verificando el backup..."
FILE_SIZE=$($SSH_CMD "ls -lh ${BACKUP_PATH}/${BACKUP_FILE} | awk '{print \$5}'")
print_success "Tamaño del backup: $FILE_SIZE"

# Paso 5: Descargar el backup
print_section "Paso 5: Descargar Backup a Máquina Local"

read -p "¿Descargar el backup ahora? (S/n): " DOWNLOAD
DOWNLOAD=${DOWNLOAD:-S}

if [[ "$DOWNLOAD" =~ ^[Ss]$ ]]; then
    LOCAL_PATH="./backups"
    mkdir -p "$LOCAL_PATH"
    
    print_info "Descargando ${BACKUP_FILE}..."
    
    if scp "${VPS_USER}@${VPS_HOST}:${BACKUP_PATH}/${BACKUP_FILE}" "${LOCAL_PATH}/"; then
        print_success "Backup descargado a: ${LOCAL_PATH}/${BACKUP_FILE}"
        print_info "Puedes usar este archivo para importar a NeonDB"
    else
        print_error "Error al descargar el backup"
        print_info "Puedes descargarlo manualmente con:"
        echo "  scp ${VPS_USER}@${VPS_HOST}:${BACKUP_PATH}/${BACKUP_FILE} ./"
        exit 1
    fi
else
    print_info "Para descargar el backup manualmente, ejecuta:"
    echo "  scp ${VPS_USER}@${VPS_HOST}:${BACKUP_PATH}/${BACKUP_FILE} ./"
fi

# Paso 6: Próximos pasos
print_section "✅ Exportación Completada"

echo "Próximos pasos:"
echo ""
echo "1. Ve a https://neon.tech y crea un proyecto"
echo "2. Obtén la connection string de NeonDB"
echo "3. Importa el backup usando uno de estos métodos:"
echo ""

if [ "$EXPORT_FORMAT" = "1" ]; then
    echo "   Para formato .dump:"
    echo "   pg_restore -d \"<NEONDB_CONNECTION_STRING>\" --no-owner --no-privileges ${LOCAL_PATH}/${BACKUP_FILE}"
else
    echo "   Para formato .sql:"
    echo "   psql \"<NEONDB_CONNECTION_STRING>\" < ${LOCAL_PATH}/${BACKUP_FILE}"
fi

echo ""
echo "4. Actualiza DATABASE_URL en Vercel"
echo "5. Consulta MIGRACION_NEONDB.md para más detalles"
echo ""

print_success "¡Proceso de exportación completado!"


#!/bin/bash

# Script para actualizar la aplicación en producción
# Uso: ./scripts/update.sh

set -e

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_status "🔄 Iniciando actualización de aXeso..."

# 1. Crear backup antes de actualizar
print_status "Creando backup de seguridad..."
./scripts/backup.sh

# 2. Detener aplicación
print_status "Deteniendo aplicación..."
pm2 stop axeso

# 3. Actualizar código
print_status "Actualizando código desde Git..."
git pull origin main

# 4. Instalar nuevas dependencias
print_status "Instalando dependencias..."
npm ci --production

# 5. Ejecutar migraciones si las hay
print_status "Ejecutando migraciones de base de datos..."
npx prisma migrate deploy

# 6. Recompilar aplicación
print_status "Recompilando aplicación..."
npm run build

# 7. Reiniciar aplicación
print_status "Reiniciando aplicación..."
pm2 restart axeso

# 8. Verificar estado
print_status "Verificando estado de la aplicación..."
sleep 5
pm2 status axeso

print_status "✅ Actualización completada exitosamente!"
print_warning "Verificar que la aplicación esté funcionando correctamente"

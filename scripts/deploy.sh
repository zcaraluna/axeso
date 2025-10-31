#!/bin/bash

# Script de despliegue para Ubuntu VPS
# Uso: ./scripts/deploy.sh

set -e

echo "🚀 Iniciando despliegue de aXeso..."

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Función para imprimir mensajes
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Verificar que estamos en el directorio correcto
if [ ! -f "package.json" ]; then
    print_error "No se encontró package.json. Ejecutar desde la raíz del proyecto."
    exit 1
fi

# 1. Instalar dependencias del sistema
print_status "Instalando dependencias del sistema..."
sudo apt update
sudo apt install -y nodejs npm postgresql postgresql-contrib nginx

# 2. Verificar versiones
print_status "Verificando versiones..."
node --version
npm --version
psql --version

# 3. Instalar dependencias del proyecto
print_status "Instalando dependencias del proyecto..."
npm ci

# 4. Configurar base de datos PostgreSQL
print_status "Configurando base de datos..."
sudo -u postgres psql -c "CREATE DATABASE controldeacceso;" || print_warning "La base de datos ya existe"
sudo -u postgres psql -c "CREATE USER controldeacceso WITH PASSWORD 'tu_password_seguro';" || print_warning "El usuario ya existe"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE controldeacceso TO controldeacceso;"

# 5. Configurar variables de entorno
print_status "Configurando variables de entorno..."
if [ ! -f ".env.local" ]; then
    cp env.production.example .env.local
    print_warning "Archivo .env.local creado. ¡IMPORTANTE: Editar con datos reales!"
fi

# 6. Ejecutar migraciones de Prisma
print_status "Ejecutando migraciones de base de datos..."
npx prisma migrate deploy

# 7. Poblar base de datos con datos iniciales
print_status "Poblando base de datos con datos iniciales..."
npx tsx scripts/seed.ts

# 8. Compilar aplicación
print_status "Compilando aplicación para producción..."
npm run build

# 9. Instalar PM2 globalmente
print_status "Instalando PM2..."
sudo npm install -g pm2

# 10. Configurar PM2
print_status "Configurando PM2..."
pm2 start npm --name "axeso" -- start
pm2 save
pm2 startup

print_status "✅ Despliegue completado!"
print_warning "Recuerda:"
print_warning "1. Editar .env.local con datos reales"
print_warning "2. Configurar nginx (ver nginx.conf.example)"
print_warning "3. Configurar SSL con Let's Encrypt"
print_warning "4. Configurar firewall"

echo ""
print_status "Para ver logs: pm2 logs axeso"
print_status "Para reiniciar: pm2 restart axeso"
print_status "Para detener: pm2 stop axeso"

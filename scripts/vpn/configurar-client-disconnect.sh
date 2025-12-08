#!/bin/bash

# Script para configurar el hook client-disconnect en OpenVPN
# Ejecutar como root: sudo bash scripts/vpn/configurar-client-disconnect.sh

set -e

PROJECT_DIR="/home/cyberpol/web/visitantes.cyberpol.com.py/public_html"
SCRIPT_TS="$PROJECT_DIR/scripts/vpn/register-disconnect.ts"
SCRIPT_JS="$PROJECT_DIR/scripts/vpn/register-disconnect.js"
SERVER_CONF="/etc/openvpn/server.conf"
OVERRIDE_DIR="/etc/systemd/system/openvpn@server.service.d"
OVERRIDE_CONF="$OVERRIDE_DIR/override.conf"

echo "=========================================="
echo "CONFIGURACIÓN DE HOOK client-disconnect"
echo "=========================================="
echo ""

# Verificar que el script existe
if [ ! -f "$SCRIPT_TS" ]; then
    echo "Error: No se encontró $SCRIPT_TS"
    exit 1
fi

# Compilar el script TypeScript a JavaScript
echo "1. Compilando script de desconexión..."
cd "$PROJECT_DIR"

if ! command -v tsc &> /dev/null; then
    echo "Instalando TypeScript..."
    npm install -g typescript
fi

npx tsc "$SCRIPT_TS" --outDir "$(dirname "$SCRIPT_JS")" --module commonjs --target es2020 --esModuleInterop --skipLibCheck

if [ ! -f "$SCRIPT_JS" ]; then
    echo "Error: No se pudo compilar el script"
    exit 1
fi

chmod +x "$SCRIPT_JS"
echo "✓ Script compilado: $SCRIPT_JS"
echo ""

# Verificar que server.conf existe
if [ ! -f "$SERVER_CONF" ]; then
    echo "Error: No se encontró $SERVER_CONF"
    exit 1
fi

# Hacer backup de la configuración
BACKUP_FILE="${SERVER_CONF}.backup.$(date +%Y%m%d_%H%M%S)"
cp "$SERVER_CONF" "$BACKUP_FILE"
echo "2. Backup creado: $BACKUP_FILE"
echo ""

# Verificar si el hook ya está configurado
if grep -q "^client-disconnect" "$SERVER_CONF"; then
    echo "⚠ El hook client-disconnect ya está configurado"
    echo "Línea actual:"
    grep "^client-disconnect" "$SERVER_CONF"
    echo ""
    read -p "¿Deseas actualizarlo? (s/n): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Ss]$ ]]; then
        echo "Operación cancelada"
        exit 0
    fi
    # Comentar la línea antigua
    sed -i 's/^client-disconnect/#client-disconnect/' "$SERVER_CONF"
fi

# Agregar configuración client-disconnect
echo "3. Agregando hook client-disconnect a $SERVER_CONF..."
echo "" >> "$SERVER_CONF"
echo "# Hook para registrar desconexiones VPN en la base de datos" >> "$SERVER_CONF"
echo "client-disconnect \"/usr/bin/node $SCRIPT_JS\"" >> "$SERVER_CONF"

echo "✓ Hook agregado"
echo ""

# Configurar variables de entorno para el servicio OpenVPN
echo "4. Configurando variables de entorno..."
mkdir -p "$OVERRIDE_DIR"

# Cargar variables del .env
ENV_FILE="$PROJECT_DIR/.env"
if [ -f "$ENV_FILE" ]; then
    VPN_API_URL=$(grep "^VPN_API_URL=" "$ENV_FILE" | cut -d'=' -f2 | tr -d '"' | tr -d "'" || echo "http://localhost:3000")
    VPN_API_TOKEN=$(grep "^VPN_API_TOKEN=" "$ENV_FILE" | cut -d'=' -f2 | tr -d '"' | tr -d "'" || echo "")
    NODE_ENV=$(grep "^NODE_ENV=" "$ENV_FILE" | cut -d'=' -f2 | tr -d '"' | tr -d "'" || echo "production")
else
    echo "⚠ No se encontró .env, usando valores por defecto"
    VPN_API_URL="http://localhost:3000"
    VPN_API_TOKEN=""
    NODE_ENV="production"
fi

# Crear o actualizar override.conf
cat > "$OVERRIDE_CONF" << EOF
[Service]
Environment="VPN_API_URL=$VPN_API_URL"
Environment="VPN_API_TOKEN=$VPN_API_TOKEN"
Environment="NODE_ENV=$NODE_ENV"
EOF

echo "✓ Variables de entorno configuradas en $OVERRIDE_CONF"
echo ""

# Recargar systemd
echo "5. Recargando configuración de systemd..."
systemctl daemon-reload
echo "✓ Systemd recargado"
echo ""

echo "=========================================="
echo "CONFIGURACIÓN COMPLETADA"
echo "=========================================="
echo ""
echo "Configuración agregada:"
echo "  client-disconnect \"/usr/bin/node $SCRIPT_JS\""
echo ""
echo "Variables de entorno configuradas:"
echo "  VPN_API_URL=$VPN_API_URL"
echo "  VPN_API_TOKEN=${VPN_API_TOKEN:0:10}..."
echo "  NODE_ENV=$NODE_ENV"
echo ""
echo "Para aplicar los cambios, reinicia OpenVPN:"
echo "  sudo systemctl restart openvpn@server"
echo ""
echo "Para verificar que funciona:"
echo "  1. Conéctate a la VPN"
echo "  2. Desconéctate de la VPN"
echo "  3. Verifica en los logs: sudo journalctl -u openvpn@server -f"
echo ""


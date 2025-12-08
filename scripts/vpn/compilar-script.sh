#!/bin/bash

# Script para compilar register-connection.ts a JavaScript
# Ejecutar como root: sudo bash scripts/vpn/compilar-script.sh

set -e

PROJECT_DIR="/home/cyberpol/web/visitantes.cyberpol.com.py/public_html"
SCRIPT_TS="$PROJECT_DIR/scripts/vpn/register-connection.ts"
SCRIPT_JS="$PROJECT_DIR/scripts/vpn/register-connection.js"

echo "Compilando script de registro de conexiones..."
echo ""

# Verificar que TypeScript está disponible
if ! command -v tsc &> /dev/null; then
    echo "Instalando TypeScript..."
    npm install -g typescript
fi

# Compilar el script
cd "$PROJECT_DIR"
npx tsc "$SCRIPT_TS" --outDir "$(dirname "$SCRIPT_JS")" --module commonjs --target es2020 --esModuleInterop --skipLibCheck

if [ -f "$SCRIPT_JS" ]; then
    echo "✓ Script compilado exitosamente: $SCRIPT_JS"
    chmod +x "$SCRIPT_JS"
else
    echo "✗ Error: No se pudo compilar el script"
    exit 1
fi

echo ""
echo "Ahora actualiza /etc/openvpn/server.conf para usar el .js en lugar del .ts:"
echo "  client-connect \"/usr/bin/node $SCRIPT_JS\""
echo ""


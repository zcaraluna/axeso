#!/bin/bash

# Script para cambiar el hook a usar la versión simple de JavaScript
# Ejecutar como root: sudo bash scripts/vpn/cambiar-hook-a-simple.sh

set -e

PROJECT_DIR="/home/cyberpol/web/visitantes.cyberpol.com.py/public_html"
SERVER_CONF="/etc/openvpn/server.conf"
SCRIPT_SIMPLE="$PROJECT_DIR/scripts/vpn/register-connection-simple.js"
SCRIPT_DISCONNECT_SIMPLE="$PROJECT_DIR/scripts/vpn/register-disconnect-simple.js"

echo "=========================================="
echo "CAMBIAR HOOKS A VERSIÓN SIMPLE"
echo "=========================================="
echo ""

# 1. Verificar que los scripts simples existen
echo "1. Verificando scripts simples..."
echo "---------------------------------"
if [ ! -f "$SCRIPT_SIMPLE" ]; then
    echo "✗ Error: $SCRIPT_SIMPLE no existe"
    exit 1
fi

if [ ! -f "$SCRIPT_DISCONNECT_SIMPLE" ]; then
    echo "⚠ Advertencia: $SCRIPT_DISCONNECT_SIMPLE no existe (se creará)"
    # Crear versión simple de disconnect también
    cat > "$SCRIPT_DISCONNECT_SIMPLE" << 'EOF'
const https = require('https');
const http = require('http');

const certificateName = process.env.common_name || '';
const ipAddress = process.env.ifconfig_pool_remote_ip || '';
const realIpAddress = process.env.trusted_ip || process.env.untrusted_ip || '';
const API_URL = process.env.VPN_API_URL || 'http://localhost:3000';
const API_TOKEN = process.env.VPN_API_TOKEN || '';

if (!certificateName || !ipAddress) {
  process.exit(0);
}

if (!API_TOKEN) {
  process.exit(0);
}

try {
  const url = new URL(`${API_URL}/api/vpn/connections`);
  const data = JSON.stringify({
    certificateName,
    ipAddress,
    realIpAddress: realIpAddress || null,
    disconnected: true
  });

  const options = {
    hostname: url.hostname,
    port: url.port || (url.protocol === 'https:' ? 443 : 80),
    path: url.pathname,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': data.length,
      'X-API-Token': API_TOKEN
    },
    timeout: 2000
  };

  const requestModule = url.protocol === 'https:' ? https : http;
  const req = requestModule.request(options);
  
  req.on('response', (res) => {
    let responseData = '';
    res.on('data', (chunk) => { responseData += chunk; });
    res.on('end', () => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        console.log(`[VPN Disconnect] Desconexión registrada: ${certificateName}`);
      }
    });
  });

  req.on('error', () => {});
  req.on('timeout', () => { req.destroy(); });
  req.setTimeout(2000);
  req.write(data);
  req.end();
  
  process.exit(0);
} catch (error) {
  process.exit(0);
}
EOF
    chmod +x "$SCRIPT_DISCONNECT_SIMPLE"
    echo "✓ Script de desconexión simple creado"
fi

chmod +x "$SCRIPT_SIMPLE"
chmod +x "$SCRIPT_DISCONNECT_SIMPLE"
echo "✓ Scripts simples listos"
echo ""

# 2. Hacer backup
echo "2. Haciendo backup de server.conf..."
echo "-------------------------------------"
BACKUP_FILE="${SERVER_CONF}.backup.$(date +%Y%m%d_%H%M%S)"
cp "$SERVER_CONF" "$BACKUP_FILE"
echo "✓ Backup creado: $BACKUP_FILE"
echo ""

# 3. Actualizar hooks en server.conf
echo "3. Actualizando hooks en server.conf..."
echo "----------------------------------------"
# Eliminar hooks antiguos
sed -i '/^client-connect/d' "$SERVER_CONF"
sed -i '/^client-disconnect/d' "$SERVER_CONF"
sed -i '/^#client-connect/d' "$SERVER_CONF"
sed -i '/^#client-disconnect/d' "$SERVER_CONF"

# Agregar nuevos hooks con scripts simples
echo "" >> "$SERVER_CONF"
echo "# Hooks para registrar conexiones VPN (versión simple)" >> "$SERVER_CONF"
echo "client-connect \"/usr/bin/node $SCRIPT_SIMPLE\"" >> "$SERVER_CONF"
echo "client-disconnect \"/usr/bin/node $SCRIPT_DISCONNECT_SIMPLE\"" >> "$SERVER_CONF"
echo "✓ Hooks actualizados"
echo ""

# 4. Verificar sintaxis
echo "4. Verificando sintaxis de OpenVPN..."
echo "--------------------------------------"
if openvpn --config "$SERVER_CONF" --verb 0 --dev null --test-crypto 2>&1 | grep -q "Configuration errors"; then
    echo "✗ Error en sintaxis"
    openvpn --config "$SERVER_CONF" --verb 0 --dev null --test-crypto
    cp "$BACKUP_FILE" "$SERVER_CONF"
    exit 1
fi
echo "✓ Sintaxis correcta"
echo ""

# 5. Reiniciar OpenVPN
echo "5. Reiniciando OpenVPN..."
echo "-------------------------"
systemctl daemon-reload
systemctl restart openvpn@server

sleep 2

if systemctl is-active --quiet openvpn@server; then
    echo "✓ OpenVPN reiniciado"
else
    echo "✗ Error: OpenVPN no está corriendo"
    journalctl -u openvpn@server --no-pager -n 10
    exit 1
fi
echo ""

echo "=========================================="
echo "HOOKS ACTUALIZADOS A VERSIÓN SIMPLE"
echo "=========================================="
echo ""
echo "Ahora prueba conectarte desde Windows."
echo "Los hooks deberían funcionar sin bloquear la conexión."
echo ""


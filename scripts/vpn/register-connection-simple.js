/**
 * Script SIMPLE para registrar conexiones VPN
 * Versión ultra-simple que siempre termina rápido
 */

const http = require('http');

// Obtener variables de entorno
const certName = process.env.common_name || '';
const ipAddr = process.env.ifconfig_pool_remote_ip || '';
const realIp = process.env.trusted_ip || process.env.untrusted_ip || '';
const apiUrl = process.env.VPN_API_URL || 'http://localhost:3000';
const apiToken = process.env.VPN_API_TOKEN || '';

// Si faltan datos críticos, salir inmediatamente
if (!certName || !ipAddr) {
  process.exit(0);
}

if (!apiToken) {
  process.exit(0);
}

// Intentar registrar (pero no bloquear si falla)
try {
  const data = JSON.stringify({
    certificateName: certName,
    ipAddress: ipAddr,
    realIpAddress: realIp || null,
    bytesReceived: 0,
    bytesSent: 0
  });

  const url = new URL(`${apiUrl}/api/vpn/connections`);
  const options = {
    hostname: url.hostname,
    port: url.port || 3000,
    path: url.pathname,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data),
      'x-api-token': apiToken
    },
    timeout: 1000
  };

  const req = http.request(options);
  
  // Manejar en background (no bloquea)
  req.on('response', (res) => {
    let body = '';
    res.on('data', (chunk) => { body += chunk; });
    res.on('end', () => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        console.log(`[VPN] Registrado: ${certName} -> ${ipAddr}`);
      }
    });
  });
  
  req.on('error', () => {});
  req.on('timeout', () => { req.destroy(); });
  
  req.setTimeout(1000);
  req.write(data);
  req.end();
  
  // CRÍTICO: Salir inmediatamente (no esperar respuesta)
  process.exit(0);
} catch (e) {
  // Cualquier error: salir con éxito para no bloquear VPN
  process.exit(0);
}

/**
 * Script SIMPLE para registrar conexiones VPN
 * Versión JavaScript pura (sin TypeScript) para evitar problemas de compilación
 * 
 * IMPORTANTE: Debe terminar en menos de 100ms para no bloquear OpenVPN
 */

const https = require('https');
const http = require('http');

// Variables de entorno de OpenVPN
const certificateName = process.env.common_name || '';
const ipAddress = process.env.ifconfig_pool_remote_ip || '';
const realIpAddress = process.env.trusted_ip || process.env.untrusted_ip || '';
const API_URL = process.env.VPN_API_URL || 'http://localhost:3000';
const API_TOKEN = process.env.VPN_API_TOKEN || '';

// Validaciones rápidas
if (!certificateName || !ipAddress) {
  console.error(`[VPN Register] Error: certificateName (${certificateName}) o ipAddress (${ipAddress}) faltantes`);
  process.exit(0);
}

if (!API_TOKEN) {
  console.error('[VPN Register] Advertencia: VPN_API_TOKEN no configurado');
  process.exit(0);
}

// Hacer la petición HTTP y salir inmediatamente
try {
  const url = new URL(`${API_URL}/api/vpn/connections`);
  const data = JSON.stringify({
    certificateName,
    ipAddress,
    realIpAddress: realIpAddress || null,
    bytesReceived: 0,
    bytesSent: 0
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

  // Crear la petición
  const req = requestModule.request(options);

  // Manejar respuesta en background (no bloquea)
  req.on('response', (res) => {
    let responseData = '';
    res.on('data', (chunk) => { responseData += chunk; });
    res.on('end', () => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        console.log(`[VPN Register] Conexión registrada: ${certificateName} -> ${ipAddress} (real: ${realIpAddress || 'N/A'})`);
      } else {
        console.error(`[VPN Register] Error HTTP ${res.statusCode}: ${responseData.substring(0, 200)}`);
      }
    });
  });

  req.on('error', (error) => {
    console.error(`[VPN Register] Error de conexión: ${error.message}`);
  });

  req.on('timeout', () => {
    req.destroy();
    console.error('[VPN Register] Timeout');
  });

  req.setTimeout(2000);
  req.write(data);
  req.end();

  // CRÍTICO: Salir inmediatamente sin esperar
  process.exit(0);
} catch (error) {
  console.error('[VPN Register] Error inesperado:', error);
  process.exit(0);
}


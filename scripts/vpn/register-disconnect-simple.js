/**
 * Script SIMPLE para registrar desconexiones VPN
 * Versión JavaScript pura (sin TypeScript)
 */

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
      'x-api-token': API_TOKEN
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


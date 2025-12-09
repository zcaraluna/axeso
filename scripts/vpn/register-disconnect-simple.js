/**
 * Script SIMPLE para registrar desconexiones VPN
 */

const http = require('http');

const certName = process.env.common_name || '';
const ipAddr = process.env.ifconfig_pool_remote_ip || '';
const realIp = process.env.trusted_ip || process.env.untrusted_ip || '';
const apiUrl = process.env.VPN_API_URL || 'http://localhost:3000';
const apiToken = process.env.VPN_API_TOKEN || '';

if (!certName || !ipAddr || !apiToken) {
  process.exit(0);
}

try {
  const data = JSON.stringify({
    certificateName: certName,
    ipAddress: ipAddr,
    realIpAddress: realIp || null,
    disconnected: true
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
  req.on('response', () => {});
  req.on('error', () => {});
  req.on('timeout', () => { req.destroy(); });
  req.setTimeout(1000);
  req.write(data);
  req.end();
  
  process.exit(0);
} catch (e) {
  process.exit(0);
}

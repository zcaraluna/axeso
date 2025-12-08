/**
 * Script para registrar desconexiones VPN en la base de datos
 * Este script debe ser llamado desde OpenVPN usando el hook 'client-disconnect'
 * 
 * Configuración en OpenVPN server.conf:
 * client-disconnect "/usr/bin/node /ruta/al/proyecto/scripts/vpn/register-disconnect.ts"
 */

import * as https from 'https';
import * as http from 'http';

// Variables de entorno de OpenVPN disponibles en el hook
const certificateName = process.env.common_name || '';
const ipAddress = process.env.ifconfig_pool_remote_ip || '';
const realIpAddress = process.env.trusted_ip || process.env.untrusted_ip || '';

// Configuración de la API
const API_URL = process.env.VPN_API_URL || 'http://localhost:3000';
const API_TOKEN = process.env.VPN_API_TOKEN || '';

async function registerDisconnect() {
  // IMPORTANTE: Este script NO debe bloquear la desconexión VPN si falla
  // Si hay errores, los logueamos pero salimos con código 0
  
  if (!certificateName || !ipAddress) {
    console.error(`[VPN Disconnect] Error: certificateName (${certificateName}) o ipAddress (${ipAddress}) faltantes`);
    process.exit(0); // Salir con éxito para no bloquear la desconexión
  }

  if (!API_TOKEN) {
    console.error('[VPN Disconnect] Advertencia: VPN_API_TOKEN no está configurado. La desconexión no se registrará.');
    process.exit(0);
  }

  try {
    const url = new URL(`${API_URL}/api/vpn/connections`);
    const data = JSON.stringify({
      certificateName,
      ipAddress,
      realIpAddress: realIpAddress || null,
      disconnected: true // Marcar como desconectada
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
      timeout: 5000
    };

    const requestModule = url.protocol === 'https:' ? https : http;

    await new Promise<void>((resolve) => {
      const req = requestModule.request(options, (res) => {
        let responseData = '';

        res.on('data', (chunk) => {
          responseData += chunk;
        });

        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            console.log(`[VPN Disconnect] Desconexión registrada: ${certificateName} -> ${ipAddress}`);
          } else {
            console.error(`[VPN Disconnect] Error HTTP ${res.statusCode}: ${responseData}`);
          }
          resolve(); // Siempre resolver para no bloquear
        });
      });

      req.on('error', (error) => {
        console.error(`[VPN Disconnect] Error de conexión: ${error.message}`);
        resolve(); // Siempre resolver para no bloquear
      });

      req.on('timeout', () => {
        console.error('[VPN Disconnect] Timeout al conectar con la API');
        req.destroy();
        resolve(); // Siempre resolver para no bloquear
      });

      req.setTimeout(5000);
      req.write(data);
      req.end();
    });

    process.exit(0); // Siempre salir con éxito
  } catch (error) {
    console.error('[VPN Disconnect] Error inesperado:', error);
    process.exit(0); // Siempre salir con éxito
  }
}

// Ejecutar registro
registerDisconnect();


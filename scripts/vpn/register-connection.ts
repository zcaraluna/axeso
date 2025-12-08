/**
 * Script para registrar conexiones VPN en la base de datos
 * Este script debe ser llamado desde OpenVPN usando el hook 'client-connect'
 * 
 * Configuración en OpenVPN server.conf:
 * client-connect "/usr/bin/node /ruta/al/proyecto/scripts/vpn/register-connection.ts"
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as https from 'https';
import * as http from 'http';

const execAsync = promisify(exec);

// Variables de entorno de OpenVPN disponibles en el hook
const certificateName = process.env.common_name || '';
const ipAddress = process.env.ifconfig_pool_remote_ip || '';
const realIpAddress = process.env.trusted_ip || process.env.untrusted_ip || '';

// Configuración de la API
const API_URL = process.env.VPN_API_URL || 'http://localhost:3000';
const API_TOKEN = process.env.VPN_API_TOKEN || '';

async function registerConnection() {
  // IMPORTANTE: Este script NO debe bloquear la conexión VPN si falla
  // Si hay errores, los logueamos pero salimos con código 0 para permitir la conexión
  
  if (!certificateName || !ipAddress) {
    console.error(`[VPN Register] Error: certificateName (${certificateName}) o ipAddress (${ipAddress}) faltantes`);
    // Salir con éxito para no bloquear la conexión VPN
    process.exit(0);
  }

  if (!API_TOKEN) {
    console.error('[VPN Register] Advertencia: VPN_API_TOKEN no está configurado. La conexión se permitirá pero no se registrará.');
    // Salir con éxito para no bloquear la conexión VPN
    process.exit(0);
  }

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
      // Timeout para evitar que el script se cuelgue
      timeout: 5000
    };

    const requestModule = url.protocol === 'https:' ? https : http;

    await new Promise<void>((resolve, reject) => {
      const req = requestModule.request(options, (res) => {
        let responseData = '';

        res.on('data', (chunk) => {
          responseData += chunk;
        });

        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            console.log(`[VPN Register] Conexión registrada: ${certificateName} -> ${ipAddress} (real: ${realIpAddress || 'N/A'})`);
            resolve();
          } else {
            console.error(`[VPN Register] Error HTTP ${res.statusCode}: ${responseData}`);
            // No rechazar, solo loguear el error
            resolve();
          }
        });
      });

      req.on('error', (error) => {
        console.error(`[VPN Register] Error de conexión a API: ${error.message}`);
        // No rechazar, solo loguear el error
        resolve();
      });

      req.on('timeout', () => {
        console.error('[VPN Register] Timeout al conectar con la API');
        req.destroy();
        resolve();
      });

      req.setTimeout(5000);
      req.write(data);
      req.end();
    });

    // Siempre salir con éxito para no bloquear la conexión VPN
    process.exit(0);
  } catch (error) {
    console.error('[VPN Register] Error inesperado:', error);
    // Siempre salir con éxito para no bloquear la conexión VPN
    process.exit(0);
  }
}

// Ejecutar registro
registerConnection();



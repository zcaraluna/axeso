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
  if (!certificateName || !ipAddress) {
    console.error('Error: certificateName e ipAddress son requeridos');
    process.exit(1);
  }

  if (!API_TOKEN) {
    console.error('Error: VPN_API_TOKEN no está configurado');
    process.exit(1);
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
      }
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
            console.log(`Conexión registrada: ${certificateName} -> ${ipAddress}`);
            resolve();
          } else {
            console.error(`Error al registrar conexión: ${res.statusCode} - ${responseData}`);
            reject(new Error(`HTTP ${res.statusCode}`));
          }
        });
      });

      req.on('error', (error) => {
        console.error(`Error de conexión: ${error.message}`);
        reject(error);
      });

      req.write(data);
      req.end();
    });

    process.exit(0);
  } catch (error) {
    console.error('Error al registrar conexión VPN:', error);
    process.exit(1);
  }
}

// Ejecutar registro
registerConnection();



import { NextRequest, NextResponse } from 'next/server';
import { readFile, stat } from 'fs/promises';
import { existsSync } from 'fs';

/**
 * GET /api/vpn/check-status
 * Verifica conexiones VPN activas leyendo el archivo de estado de OpenVPN
 * No requiere hooks, lee directamente el archivo de estado
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const realIp = searchParams.get('realIp');
    
    if (!realIp) {
      return NextResponse.json({ error: 'realIp es requerido' }, { status: 400 });
    }

    const statusFile = '/var/log/openvpn-status.log';
    
    // Verificar si el archivo existe
    if (!existsSync(statusFile)) {
      return NextResponse.json({ 
        isActive: false,
        error: 'Archivo de estado no encontrado',
        statusFile 
      });
    }

    try {
      const content = await readFile(statusFile, 'utf-8');
      
      // Buscar la IP en el archivo de estado
      // Formato del archivo:
      // OpenVPN CLIENT LIST
      // Updated,<timestamp>
      // Common Name,Real Address,Virtual Address,Bytes Received,Bytes Sent,Connected Since
      // <client data>
      // ROUTING TABLE
      // ...
      const lines = content.split('\n');
      let found = false;
      let connectionInfo = null;
      let inClientList = false;
      let fileUpdatedAt: Date | null = null;
      
      // Primero, obtener la fecha de actualización del archivo
      for (const line of lines) {
        if (line.trim().startsWith('Updated,')) {
          const updateTimeStr = line.trim().split(',')[1]?.trim();
          if (updateTimeStr) {
            try {
              fileUpdatedAt = new Date(updateTimeStr);
            } catch {
              // Si no se puede parsear, usar la fecha actual
              fileUpdatedAt = new Date();
            }
          }
          break;
        }
      }
      
      // Si no encontramos la fecha de actualización, usar la fecha actual
      if (!fileUpdatedAt) {
        fileUpdatedAt = new Date();
      }
      
      for (const line of lines) {
        const trimmedLine = line.trim();
        
        // Detectar inicio de sección CLIENT LIST
        if (trimmedLine === 'OpenVPN CLIENT LIST' || trimmedLine === 'CLIENT LIST') {
          inClientList = true;
          continue;
        }
        
        // Detectar fin de sección CLIENT LIST (inicio de otras secciones)
        if (trimmedLine === 'ROUTING TABLE' || trimmedLine === 'GLOBAL STATS' || trimmedLine === 'END') {
          inClientList = false;
          continue;
        }
        
        // Solo procesar líneas dentro de CLIENT LIST
        if (inClientList && trimmedLine && !trimmedLine.startsWith('#') && !trimmedLine.startsWith('Updated,') && !trimmedLine.startsWith('Common Name,')) {
          const parts = trimmedLine.split(',');
          if (parts.length >= 2) {
            const realAddress = parts[1].trim();
            // Verificar que tiene formato IP:PUERTO
            if (realAddress.includes(':')) {
              const ipFromAddress = realAddress.split(':')[0];
              
              // Verificar que es una IP válida (formato IPv4)
              if (/^\d+\.\d+\.\d+\.\d+$/.test(ipFromAddress) && ipFromAddress === realIp) {
                // Verificar si la conexión tiene "Connected Since" (última actividad)
                const connectedSinceStr = parts[5]?.trim();
                let isRecent = true;
                
                if (connectedSinceStr) {
                  try {
                    const connectedSince = new Date(connectedSinceStr);
                    const timeSinceConnection = Date.now() - connectedSince.getTime();
                    // Si la conexión no ha tenido actividad en los últimos 5 minutos, considerarla inactiva
                    // Esto ayuda a detectar conexiones "zombie" que OpenVPN no eliminó
                    if (timeSinceConnection > 5 * 60 * 1000) {
                      // Verificar también cuándo se actualizó el archivo por última vez
                      const timeSinceFileUpdate = Date.now() - fileUpdatedAt.getTime();
                      // Si el archivo se actualizó recientemente pero la conexión es antigua, probablemente está desconectada
                      if (timeSinceFileUpdate < 60 * 1000 && timeSinceConnection > 2 * 60 * 1000) {
                        isRecent = false;
                      }
                    }
                  } catch {
                    // Si no se puede parsear la fecha, asumir que es reciente
                  }
                }
                
                if (isRecent) {
                  found = true;
                  connectionInfo = {
                    commonName: parts[0]?.trim() || '',
                    realAddress: realAddress,
                    virtualAddress: parts[2]?.trim() || '',
                    connectedSince: connectedSinceStr || ''
                  };
                  break;
                }
              }
            }
          }
        }
      }
      
      // Obtener información de última actualización del archivo
      const stats = await stat(statusFile);
      const lastModified = stats.mtime;
      
      const response = NextResponse.json({ 
        isActive: found,
        realIp,
        connectionInfo,
        checkedAt: new Date().toISOString(),
        fileLastModified: lastModified.toISOString(),
        fileAgeSeconds: Math.floor((Date.now() - lastModified.getTime()) / 1000)
      });
      
      // Agregar headers para evitar caché
      response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
      response.headers.set('Pragma', 'no-cache');
      response.headers.set('Expires', '0');
      
      return response;
    } catch (readError) {
      console.error('[VPN Status] Error leyendo archivo de estado:', readError);
      return NextResponse.json({ 
        isActive: false,
        error: 'Error al leer archivo de estado',
        details: readError instanceof Error ? readError.message : 'Unknown error'
      }, { status: 500 });
    }
  } catch (error) {
    console.error('[VPN Status] Error:', error);
    return NextResponse.json(
      { error: 'Error al verificar estado VPN', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}


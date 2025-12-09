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
      // Virtual Address,Common Name,Real Address,Last Ref
      // ...
      const lines = content.split('\n');
      let found = false;
      let connectionInfo = null;
      let inClientList = false;
      let inRoutingTable = false;
      let fileUpdatedAt: Date | null = null;
      let routingTableLastRef: Date | null = null;
      
      // Primero, obtener la fecha de actualización del archivo
      for (const line of lines) {
        if (line.trim().startsWith('Updated,')) {
          const updateTimeStr = line.trim().split(',')[1]?.trim();
          if (updateTimeStr) {
            try {
              fileUpdatedAt = new Date(updateTimeStr);
            } catch {
              fileUpdatedAt = new Date();
            }
          }
          break;
        }
      }
      
      if (!fileUpdatedAt) {
        fileUpdatedAt = new Date();
      }
      
      // Buscar en CLIENT LIST y también obtener Last Ref de ROUTING TABLE
      for (const line of lines) {
        const trimmedLine = line.trim();
        
        // Detectar inicio de sección CLIENT LIST
        if (trimmedLine === 'OpenVPN CLIENT LIST' || trimmedLine === 'CLIENT LIST') {
          inClientList = true;
          inRoutingTable = false;
          continue;
        }
        
        // Detectar inicio de ROUTING TABLE
        if (trimmedLine === 'ROUTING TABLE') {
          inClientList = false;
          inRoutingTable = true;
          continue;
        }
        
        // Detectar fin de secciones
        if (trimmedLine === 'GLOBAL STATS' || trimmedLine === 'END') {
          inClientList = false;
          inRoutingTable = false;
          continue;
        }
        
        // Buscar en CLIENT LIST
        if (inClientList && trimmedLine && !trimmedLine.startsWith('#') && !trimmedLine.startsWith('Updated,') && !trimmedLine.startsWith('Common Name,')) {
          const parts = trimmedLine.split(',');
          if (parts.length >= 2) {
            const realAddress = parts[1].trim();
            if (realAddress.includes(':')) {
              const ipFromAddress = realAddress.split(':')[0];
              
              if (/^\d+\.\d+\.\d+\.\d+$/.test(ipFromAddress) && ipFromAddress === realIp) {
                const connectedSinceStr = parts[5]?.trim();
                
                // Verificar también en ROUTING TABLE para obtener Last Ref
                for (const routingLine of lines) {
                  const routingTrimmed = routingLine.trim();
                  if (routingTrimmed.startsWith('ROUTING TABLE')) {
                    inRoutingTable = true;
                    continue;
                  }
                  if (inRoutingTable && routingTrimmed && !routingTrimmed.startsWith('Virtual Address,') && routingTrimmed.includes(realIp)) {
                    const routingParts = routingTrimmed.split(',');
                    if (routingParts.length >= 4) {
                      const lastRefStr = routingParts[3]?.trim();
                      if (lastRefStr) {
                        try {
                          routingTableLastRef = new Date(lastRefStr);
                        } catch {
                          // Ignorar si no se puede parsear
                        }
                      }
                    }
                    break;
                  }
                }
                
                // Verificar si la conexión está realmente activa
                // Si el archivo se actualizó recientemente pero Last Ref es antiguo, está desconectada
                const now = Date.now();
                const timeSinceFileUpdate = now - fileUpdatedAt.getTime();
                let isActive = true;
                
                if (routingTableLastRef) {
                  const timeSinceLastRef = now - routingTableLastRef.getTime();
                  // Si el archivo se actualizó en los últimos 30 segundos pero Last Ref tiene más de 1 minuto, está desconectada
                  if (timeSinceFileUpdate < 30 * 1000 && timeSinceLastRef > 60 * 1000) {
                    isActive = false;
                  }
                } else if (connectedSinceStr) {
                  // Si no hay Last Ref, usar Connected Since
                  try {
                    const connectedSince = new Date(connectedSinceStr);
                    const timeSinceConnection = now - connectedSince.getTime();
                    // Si el archivo se actualizó recientemente pero la conexión es antigua, está desconectada
                    if (timeSinceFileUpdate < 30 * 1000 && timeSinceConnection > 90 * 1000) {
                      isActive = false;
                    }
                  } catch {
                    // Si no se puede parsear, asumir activa
                  }
                }
                
                if (isActive) {
                  found = true;
                  connectionInfo = {
                    commonName: parts[0]?.trim() || '',
                    realAddress: realAddress,
                    virtualAddress: parts[2]?.trim() || '',
                    connectedSince: connectedSinceStr || '',
                    lastRef: routingTableLastRef?.toISOString() || null
                  };
                }
                break;
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


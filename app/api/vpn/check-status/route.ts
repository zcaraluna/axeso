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
      
      // Primero buscar en CLIENT LIST
      let foundInClientList = false;
      let connectedSinceStr = '';
      let commonName = '';
      let realAddress = '';
      let virtualAddress = '';
      
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
            const addr = parts[1].trim();
            if (addr.includes(':')) {
              const ipFromAddress = addr.split(':')[0];
              
              if (/^\d+\.\d+\.\d+\.\d+$/.test(ipFromAddress) && ipFromAddress === realIp) {
                foundInClientList = true;
                commonName = parts[0]?.trim() || '';
                realAddress = addr;
                virtualAddress = parts[2]?.trim() || '';
                connectedSinceStr = parts[5]?.trim() || '';
                break;
              }
            }
          }
        }
      }
      
      // Ahora buscar Last Ref en ROUTING TABLE
      inRoutingTable = false;
      for (const line of lines) {
        const trimmedLine = line.trim();
        
        if (trimmedLine === 'ROUTING TABLE') {
          inRoutingTable = true;
          continue;
        }
        
        if (trimmedLine === 'GLOBAL STATS' || trimmedLine === 'END') {
          inRoutingTable = false;
          continue;
        }
        
        if (inRoutingTable && trimmedLine && !trimmedLine.startsWith('Virtual Address,') && trimmedLine.includes(realIp)) {
          const routingParts = trimmedLine.split(',');
          if (routingParts.length >= 4) {
            const routingRealAddress = routingParts[2]?.trim();
            if (routingRealAddress && routingRealAddress.includes(':')) {
              const routingIpFromAddress = routingRealAddress.split(':')[0];
              if (routingIpFromAddress === realIp) {
                const lastRefStr = routingParts[3]?.trim();
                if (lastRefStr) {
                  try {
                    routingTableLastRef = new Date(lastRefStr);
                  } catch {
                    // Ignorar si no se puede parsear
                  }
                }
                break;
              }
            }
          }
        }
      }
      
      // Determinar si la conexión está activa
      const now = Date.now();
      let isActive = false;
      
      if (foundInClientList) {
        // Si está en CLIENT LIST, verificar Last Ref para determinar si está realmente activa
        if (routingTableLastRef) {
          const timeSinceLastRef = now - routingTableLastRef.getTime();
          // Si Last Ref es más antiguo que 15 segundos, la conexión está desconectada
          // El archivo se actualiza cada 10 segundos, así que 15 segundos es un umbral seguro
          isActive = timeSinceLastRef <= 15 * 1000;
        } else if (connectedSinceStr) {
          // Si no hay Last Ref, usar Connected Since como fallback
          try {
            const connectedSince = new Date(connectedSinceStr);
            const timeSinceConnection = now - connectedSince.getTime();
            // Si la conexión es muy antigua y no hay Last Ref, probablemente está desconectada
            // Verificar también si el archivo se actualizó recientemente
            const timeSinceFileUpdate = now - fileUpdatedAt.getTime();
            if (timeSinceConnection > 30 * 1000 && timeSinceFileUpdate < 20 * 1000) {
              isActive = false;
            } else {
              isActive = true; // Si no hay Last Ref pero está en CLIENT LIST, asumir activa
            }
          } catch {
            isActive = true; // Si no se puede parsear, asumir activa (conservador)
          }
        } else {
          // Si está en CLIENT LIST pero no hay Last Ref ni Connected Since, asumir activa
          isActive = true;
        }
      } else if (routingTableLastRef) {
        // Si NO está en CLIENT LIST pero tiene Last Ref en ROUTING TABLE
        // Es una conexión "zombie" - está desconectada
        const timeSinceLastRef = now - routingTableLastRef.getTime();
        // Si Last Ref es más antiguo que 5 segundos, definitivamente está desconectada
        // (si no está en CLIENT LIST, no debería tener Last Ref reciente)
        isActive = false;
      }
      
      // Si la conexión está activa, establecer found y connectionInfo
      if (isActive) {
        found = true;
        connectionInfo = {
          commonName: commonName || '',
          realAddress: realAddress || '',
          virtualAddress: virtualAddress || '',
          connectedSince: connectedSinceStr || '',
          lastRef: routingTableLastRef?.toISOString() || null
        };
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


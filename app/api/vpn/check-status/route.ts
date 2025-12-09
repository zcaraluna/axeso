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
      // IMPORTANTE: Una conexión solo está activa si:
      // 1. Está en CLIENT LIST (conexión establecida)
      // 2. Y tiene Last Ref reciente (menos de 10 segundos)
      // Si no está en CLIENT LIST, NO está activa, incluso si tiene Last Ref en ROUTING TABLE
      const now = Date.now();
      let isActive = false;
      
      if (foundInClientList) {
        // Solo considerar activa si está en CLIENT LIST Y tiene Last Ref reciente
        if (routingTableLastRef) {
          const timeSinceLastRef = now - routingTableLastRef.getTime();
          // Si Last Ref es más antiguo que 10 segundos, la conexión está desconectada
          // Reducido a 10 segundos para detección más rápida y precisa
          // El archivo se actualiza cada 10 segundos, así que 10 segundos es el umbral máximo
          isActive = timeSinceLastRef <= 10 * 1000;
        } else {
          // Si está en CLIENT LIST pero NO tiene Last Ref, verificar Connected Since
          // Esto puede pasar si la conexión es muy nueva o si hay un problema con el archivo de estado
          if (connectedSinceStr) {
            try {
              const connectedSince = new Date(connectedSinceStr);
              const timeSinceConnection = now - connectedSince.getTime();
              // Si la conexión es muy reciente (menos de 20 segundos) y no hay Last Ref,
              // puede ser que el archivo aún no se haya actualizado con el Last Ref
              // Pero si es más antigua, probablemente está desconectada
              const timeSinceFileUpdate = now - fileUpdatedAt.getTime();
              // Solo considerar activa si la conexión es muy reciente Y el archivo se actualizó recientemente
              isActive = timeSinceConnection <= 20 * 1000 && timeSinceFileUpdate <= 15 * 1000;
            } catch {
              // Si no se puede parsear, NO asumir activa (más estricto)
              isActive = false;
            }
          } else {
            // Si no hay Last Ref ni Connected Since, NO asumir activa
            isActive = false;
          }
        }
      }
      // Si NO está en CLIENT LIST, definitivamente NO está activa
      // (no importa si tiene Last Ref en ROUTING TABLE - es una conexión "zombie")
      
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


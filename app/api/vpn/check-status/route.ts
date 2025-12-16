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
      
      // Log para debugging
      console.log(`[VPN Status] Verificando IP: ${realIp}`);
      console.log(`[VPN Status] Archivo existe, tamaño: ${content.length} bytes`);
      
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
            let ipFromAddress = '';
            
            // Extraer IP: puede tener formato IP:PUERTO o solo IP
            if (addr.includes(':')) {
              ipFromAddress = addr.split(':')[0];
            } else {
              // Si no tiene puerto, la dirección completa puede ser la IP
              ipFromAddress = addr;
            }
            
            // Verificar si es una IP válida y coincide con la IP buscada
            if (/^\d+\.\d+\.\d+\.\d+$/.test(ipFromAddress) && ipFromAddress === realIp) {
              foundInClientList = true;
              commonName = parts[0]?.trim() || '';
              realAddress = addr;
              virtualAddress = parts[2]?.trim() || '';
              connectedSinceStr = parts[5]?.trim() || '';
              console.log(`[VPN Status] IP ${realIp} encontrada en CLIENT LIST: ${trimmedLine}`);
              break;
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
            let routingIpFromAddress = '';
            
            // Extraer IP: puede tener formato IP:PUERTO o solo IP
            if (routingRealAddress && routingRealAddress.includes(':')) {
              routingIpFromAddress = routingRealAddress.split(':')[0];
            } else if (routingRealAddress) {
              routingIpFromAddress = routingRealAddress;
            }
            
            if (routingIpFromAddress && /^\d+\.\d+\.\d+\.\d+$/.test(routingIpFromAddress) && routingIpFromAddress === realIp) {
              const lastRefStr = routingParts[3]?.trim();
              if (lastRefStr) {
                try {
                  routingTableLastRef = new Date(lastRefStr);
                  console.log(`[VPN Status] IP ${realIp} encontrada en ROUTING TABLE con Last Ref: ${lastRefStr}`);
                } catch {
                  // Ignorar si no se puede parsear
                }
              }
              break;
            }
          }
        }
      }
      
      // Determinar si la conexión está activa
      // Estrategia: Usar Last Ref como fuente principal de verdad (más confiable)
      // - Si tiene Last Ref reciente (≤15s) → activa (independientemente de CLIENT LIST)
      //   Esto evita alternancia cuando el archivo se actualiza y la conexión desaparece temporalmente de CLIENT LIST
      // - Si NO tiene Last Ref pero está en CLIENT LIST → verificar Connected Since
      // - Si Last Ref es antiguo (>15s) Y no está en CLIENT LIST → desconectada
      const now = Date.now();
      let isActive = false;
      
      if (routingTableLastRef) {
        // Si hay Last Ref, usarlo como fuente principal de verdad
        const timeSinceLastRef = now - routingTableLastRef.getTime();
        // Umbral de 15 segundos para dar estabilidad
        // El archivo se actualiza cada 10 segundos, así que 15 segundos es seguro
        isActive = timeSinceLastRef <= 15 * 1000;
      } else if (foundInClientList) {
        // Si NO hay Last Ref pero está en CLIENT LIST, verificar Connected Since
        if (connectedSinceStr) {
          try {
            const connectedSince = new Date(connectedSinceStr);
            const timeSinceConnection = now - connectedSince.getTime();
            const timeSinceFileUpdate = now - fileUpdatedAt.getTime();
            // Solo considerar activa si la conexión es muy reciente Y el archivo se actualizó recientemente
            // Esto cubre el caso donde la conexión es muy nueva y aún no tiene Last Ref
            isActive = timeSinceConnection <= 20 * 1000 && timeSinceFileUpdate <= 15 * 1000;
          } catch {
            isActive = false;
          }
        } else {
          // Si está en CLIENT LIST pero no tiene Last Ref ni Connected Since,
          // puede ser un error en el archivo, pero por seguridad asumir inactiva
          isActive = false;
        }
      }
      // Si NO está en CLIENT LIST y NO tiene Last Ref, definitivamente NO está activa
      
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
        console.log(`[VPN Status] Conexión ACTIVA para IP ${realIp}`, connectionInfo);
      } else {
        console.log(`[VPN Status] Conexión INACTIVA para IP ${realIp}`, {
          foundInClientList,
          routingTableLastRef: routingTableLastRef?.toISOString() || null,
          connectedSinceStr: connectedSinceStr || null
        });
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


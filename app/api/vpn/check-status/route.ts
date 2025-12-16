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
      // Obtener información del archivo ANTES de leerlo para verificar consistencia
      const statsBefore = await stat(statusFile);
      const mtimeBefore = statsBefore.mtime.getTime();
      
      const content = await readFile(statusFile, 'utf-8');
      
      // Verificar que el archivo no cambió mientras se leía (consistencia)
      const statsAfter = await stat(statusFile);
      const mtimeAfter = statsAfter.mtime.getTime();
      const fileChangedDuringRead = mtimeBefore !== mtimeAfter;
      
      // Log para debugging
      console.log(`[VPN Status] Verificando IP: ${realIp}`);
      console.log(`[VPN Status] Archivo existe, tamaño: ${content.length} bytes`);
      if (fileChangedDuringRead) {
        console.log(`[VPN Status] ⚠️ Archivo cambió durante la lectura (mtime antes: ${mtimeBefore}, después: ${mtimeAfter})`);
      }
      
      // Verificar si la IP aparece en el archivo (búsqueda simple)
      const ipInFile = content.includes(realIp);
      console.log(`[VPN Status] IP ${realIp} aparece en archivo (búsqueda simple): ${ipInFile}`);
      
      // Mostrar todas las líneas que contienen la IP
      const linesWithIp = content.split('\n').filter(line => line.includes(realIp));
      if (linesWithIp.length > 0) {
        console.log(`[VPN Status] Líneas que contienen la IP (${linesWithIp.length}):`, linesWithIp);
      } else {
        console.log(`[VPN Status] ⚠️ IP ${realIp} NO aparece en ninguna línea del archivo`);
      }
      
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
      
      // Arrays para debugging
      const allClientListIps: string[] = [];
      const allRoutingTableIps: string[] = [];
      
      for (const line of lines) {
        const trimmedLine = line.trim();
        
        // Detectar inicio de sección CLIENT LIST (múltiples formatos)
        if (trimmedLine === 'OpenVPN CLIENT LIST' || 
            trimmedLine === 'CLIENT LIST' || 
            trimmedLine.startsWith('HEADER,CLIENT_LIST')) {
          inClientList = true;
          inRoutingTable = false;
          continue;
        }
        
        // Las líneas de datos pueden empezar directamente con CLIENT_LIST,
        if (trimmedLine.startsWith('CLIENT_LIST,')) {
          inClientList = true;
          inRoutingTable = false;
          // Procesar esta línea como línea de datos
          const parts = trimmedLine.substring('CLIENT_LIST,'.length).split(',');
          if (parts.length >= 2) {
            const addr = parts[1].trim(); // Real Address está en el índice 1 después de quitar "CLIENT_LIST,"
            let ipFromAddress = '';
            
            if (addr.includes(':')) {
              ipFromAddress = addr.split(':')[0];
            } else {
              ipFromAddress = addr;
            }
            
            // Guardar todas las IPs encontradas para debugging
            if (/^\d+\.\d+\.\d+\.\d+$/.test(ipFromAddress)) {
              allClientListIps.push(ipFromAddress);
            }
            
            if (ipFromAddress === realIp) {
              foundInClientList = true;
              commonName = parts[0]?.trim() || '';
              realAddress = addr;
              virtualAddress = parts[2]?.trim() || '';
              connectedSinceStr = parts[6]?.trim() || ''; // Índice 6 en formato CLIENT_LIST,
              console.log(`[VPN Status] ✓ IP ${realIp} encontrada en CLIENT_LIST, formato: ${trimmedLine}`);
            }
          }
          continue;
        }
        
        // Detectar inicio de ROUTING TABLE (múltiples formatos)
        if (trimmedLine === 'ROUTING TABLE' || trimmedLine.startsWith('HEADER,ROUTING_TABLE')) {
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
        
        // Buscar en CLIENT LIST (líneas normales, sin prefijo CLIENT_LIST,)
        if (inClientList && trimmedLine && 
            !trimmedLine.startsWith('#') && 
            !trimmedLine.startsWith('Updated,') && 
            !trimmedLine.startsWith('Common Name,') && 
            !trimmedLine.startsWith('HEADER,') && 
            !trimmedLine.startsWith('CLIENT_LIST,')) {
          const parts = trimmedLine.split(',');
          
          if (parts.length >= 2) {
            const addr = parts[1].trim();
            let ipFromAddress = '';
            
            // Extraer IP: puede tener formato IP:PUERTO o solo IP
            if (addr.includes(':')) {
              ipFromAddress = addr.split(':')[0];
            } else {
              ipFromAddress = addr;
            }
            
            // Guardar todas las IPs encontradas para debugging
            if (/^\d+\.\d+\.\d+\.\d+$/.test(ipFromAddress)) {
              allClientListIps.push(ipFromAddress);
            }
            
            // Verificar si es una IP válida y coincide con la IP buscada
            if (ipFromAddress === realIp) {
              foundInClientList = true;
              commonName = parts[0]?.trim() || '';
              realAddress = addr;
              virtualAddress = parts[2]?.trim() || '';
              connectedSinceStr = parts[5]?.trim() || ''; // Índice 5 en formato normal
              console.log(`[VPN Status] ✓ IP ${realIp} encontrada en CLIENT LIST (formato normal): ${trimmedLine}`);
              break;
            }
          }
        }
      }
      
      // Ahora buscar Last Ref en ROUTING TABLE
      inRoutingTable = false;
      for (const line of lines) {
        const trimmedLine = line.trim();
        
        if (trimmedLine === 'ROUTING TABLE' || trimmedLine.startsWith('HEADER,ROUTING_TABLE')) {
          inRoutingTable = true;
          continue;
        }
        
        // Las líneas de datos pueden empezar directamente con ROUTING_TABLE,
        if (trimmedLine.startsWith('ROUTING_TABLE,')) {
          inRoutingTable = true;
          // Procesar esta línea como línea de datos
          const routingParts = trimmedLine.substring('ROUTING_TABLE,'.length).split(',');
          if (routingParts.length >= 3) {
            const routingRealAddress = routingParts[2]?.trim(); // Real Address está en índice 2 después de quitar "ROUTING_TABLE,"
            if (routingRealAddress && routingRealAddress.includes(':')) {
              const routingIpFromAddress = routingRealAddress.split(':')[0];
              if (/^\d+\.\d+\.\d+\.\d+$/.test(routingIpFromAddress)) {
                allRoutingTableIps.push(routingIpFromAddress);
              }
              if (routingIpFromAddress === realIp) {
                const lastRefStr = routingParts[3]?.trim(); // Last Ref está en índice 3
                if (lastRefStr) {
                  try {
                    routingTableLastRef = new Date(lastRefStr);
                    console.log(`[VPN Status] ✓ IP ${realIp} encontrada en ROUTING_TABLE, formato con Last Ref: ${lastRefStr}`);
                  } catch {
                    // Ignorar si no se puede parsear
                  }
                }
                break;
              }
            }
          }
          continue;
        }
        
        if (trimmedLine === 'GLOBAL STATS' || trimmedLine === 'END') {
          inRoutingTable = false;
          continue;
        }
        
        // Buscar en ROUTING TABLE (líneas normales, sin prefijo ROUTING_TABLE,)
        if (inRoutingTable && trimmedLine && 
            !trimmedLine.startsWith('Virtual Address,') && 
            !trimmedLine.startsWith('HEADER,') && 
            !trimmedLine.startsWith('ROUTING_TABLE,')) {
          const routingParts = trimmedLine.split(',');
          
          if (routingParts.length >= 3) {
            const routingRealAddress = routingParts[2]?.trim();
            let routingIpFromAddress = '';
            
            if (routingRealAddress && routingRealAddress.includes(':')) {
              routingIpFromAddress = routingRealAddress.split(':')[0];
            } else if (routingRealAddress) {
              routingIpFromAddress = routingRealAddress;
            }
            
            // Guardar todas las IPs encontradas para debugging
            if (/^\d+\.\d+\.\d+\.\d+$/.test(routingIpFromAddress)) {
              allRoutingTableIps.push(routingIpFromAddress);
            }
            
            if (routingIpFromAddress === realIp) {
              const lastRefStr = routingParts[3]?.trim();
              if (lastRefStr) {
                try {
                  routingTableLastRef = new Date(lastRefStr);
                  console.log(`[VPN Status] ✓ IP ${realIp} encontrada en ROUTING TABLE (formato normal) con Last Ref: ${lastRefStr}`);
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
      // Lógica simplificada y determinista para evitar intermitencia:
      // REGLA PRINCIPAL: La conexión está activa SOLO si:
      // 1. Está en CLIENT LIST (requisito obligatorio)
      // 2. Y tiene Last Ref reciente (≤12s) O Connected Since reciente (≤20s)
      // Si NO está en CLIENT LIST → definitivamente inactiva (sin excepciones)
      const now = Date.now();
      let isActive = false;
      
      // Verificar que el archivo se actualizó recientemente
      const timeSinceFileUpdate = now - fileUpdatedAt.getTime();
      // Aumentado a 30 segundos para dar más tolerancia al delay de actualización
      // El archivo se actualiza cada 10s, así que 30s es un margen seguro
      const fileIsRecent = timeSinceFileUpdate <= 30 * 1000; // 30 segundos
      
      // Log detallado del estado
      console.log(`[VPN Status] ========== ANÁLISIS COMPLETO PARA IP ${realIp} ==========`);
      console.log(`[VPN Status] foundInClientList: ${foundInClientList}`);
      console.log(`[VPN Status] hasRoutingTableLastRef: ${routingTableLastRef !== null}`);
      console.log(`[VPN Status] routingTableLastRef: ${routingTableLastRef?.toISOString() || 'null'}`);
      console.log(`[VPN Status] connectedSinceStr: ${connectedSinceStr || 'null'}`);
      console.log(`[VPN Status] timeSinceFileUpdate: ${Math.floor(timeSinceFileUpdate / 1000)}s`);
      console.log(`[VPN Status] fileIsRecent: ${fileIsRecent}`);
      console.log(`[VPN Status] allClientListIps encontradas: [${allClientListIps.join(', ')}]`);
      console.log(`[VPN Status] allRoutingTableIps encontradas: [${allRoutingTableIps.join(', ')}]`);
      
      // REGLA 1: Si NO está en CLIENT LIST → INACTIVA (sin excepciones)
      // NOTA: Confiamos en el parsing estructurado, NO en búsqueda simple de strings
      // porque la IP podría aparecer en comentarios u otras secciones que no cuentan
      if (!foundInClientList) {
        isActive = false;
        console.log(`[VPN Status] ❌ RESULTADO: IP ${realIp} NO está en CLIENT LIST → INACTIVA (sin excepciones)`);
        
        // Si tiene Last Ref pero NO está en CLIENT LIST, es una desconexión reciente
        if (routingTableLastRef) {
          const timeSinceLastRef = now - routingTableLastRef.getTime();
          const lastRefSeconds = Math.floor(timeSinceLastRef / 1000);
          console.log(`[VPN Status] ⚠️ Tiene Last Ref antiguo (${lastRefSeconds}s) pero NO está en CLIENT LIST → confirmando INACTIVA`);
        }
      } 
      // REGLA 2: Si está en CLIENT LIST, verificar Last Ref o Connected Since
      else {
        console.log(`[VPN Status] ✓ IP ${realIp} está en CLIENT LIST, verificando timestamps...`);
        
        if (routingTableLastRef) {
          const timeSinceLastRef = now - routingTableLastRef.getTime();
          const lastRefSeconds = Math.floor(timeSinceLastRef / 1000);
          
          // Está en CLIENT LIST y tiene Last Ref: activa si Last Ref ≤15s
          // Aumentado de 12s a 15s para dar margen al delay de actualización del archivo (10s)
          // Esto previene falsos negativos cuando el archivo está siendo actualizado
          isActive = timeSinceLastRef <= 15 * 1000;
          console.log(`[VPN Status] Last Ref hace ${lastRefSeconds}s (umbral: 15s) → activa: ${isActive}`);
        } else if (connectedSinceStr) {
          // Está en CLIENT LIST pero NO tiene Last Ref: usar Connected Since
          try {
            const connectedSince = new Date(connectedSinceStr);
            const timeSinceConnection = now - connectedSince.getTime();
            const connectionSeconds = Math.floor(timeSinceConnection / 1000);
            
            // Solo activa si Connected Since es reciente (≤30s) Y el archivo se actualizó recientemente
            // Aumentado de 20s a 30s para dar más margen de tolerancia
            // Si el archivo es reciente (≤30s), confiamos más en Connected Since
            const fileIsRecentExtended = timeSinceFileUpdate <= 30 * 1000;
            isActive = timeSinceConnection <= 30 * 1000 && fileIsRecentExtended;
            console.log(`[VPN Status] Connected Since hace ${connectionSeconds}s (umbral: 30s), archivo reciente: ${fileIsRecentExtended} → activa: ${isActive}`);
          } catch (error) {
            isActive = false;
            console.log(`[VPN Status] ❌ Error parseando Connected Since: ${error} → INACTIVA`);
          }
        } else {
          // Está en CLIENT LIST pero sin Last Ref ni Connected Since
          // Si el archivo es reciente, considerar activa (puede ser conexión muy nueva)
          // Si el archivo es antiguo, inactiva por seguridad
          isActive = fileIsRecent && timeSinceFileUpdate <= 15 * 1000;
          console.log(`[VPN Status] ⚠️ En CLIENT LIST pero sin Last Ref ni Connected Since, archivo reciente: ${fileIsRecent} (${Math.floor(timeSinceFileUpdate / 1000)}s) → activa: ${isActive}`);
        }
      }
      
      console.log(`[VPN Status] ========== RESULTADO FINAL: ${isActive ? 'ACTIVA' : 'INACTIVA'} ==========`);
      
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
      
      // Obtener información de última actualización del archivo (ya tenemos statsAfter)
      const lastModified = statsAfter.mtime;
      
      const response = NextResponse.json({ 
        isActive: found,
        realIp,
        connectionInfo,
        checkedAt: new Date().toISOString(),
        fileLastModified: lastModified.toISOString(),
        fileAgeSeconds: Math.floor((Date.now() - lastModified.getTime()) / 1000),
        debug: {
          foundInClientList,
          hasRoutingTableLastRef: routingTableLastRef !== null,
          routingTableLastRef: routingTableLastRef?.toISOString() || null,
          fileUpdatedAt: fileUpdatedAt?.toISOString() || null,
          fileChangedDuringRead, // Indica si el archivo cambió mientras se leía
          searchedIp: realIp,
          allClientListIps, // Todas las IPs encontradas en CLIENT LIST
          allRoutingTableIps, // Todas las IPs encontradas en ROUTING TABLE
          clientListCount: allClientListIps.length,
          routingTableCount: allRoutingTableIps.length,
        }
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


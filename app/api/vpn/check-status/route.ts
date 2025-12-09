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
      // Formato: Common Name,Real Address,Virtual Address,Bytes Received,Bytes Sent,Connected Since
      const lines = content.split('\n');
      let found = false;
      let connectionInfo = null;
      
      for (const line of lines) {
        // Buscar líneas de clientes (no comentarios, no headers)
        if (line.trim() && !line.startsWith('#') && !line.startsWith('CLIENT LIST') && !line.startsWith('ROUTING TABLE') && !line.startsWith('GLOBAL STATS')) {
          const parts = line.split(',');
          if (parts.length >= 2) {
            const realAddress = parts[1].trim();
            // Extraer IP de "IP:PUERTO"
            const ipFromAddress = realAddress.split(':')[0];
            
            if (ipFromAddress === realIp) {
              found = true;
              connectionInfo = {
                commonName: parts[0]?.trim() || '',
                realAddress: realAddress,
                virtualAddress: parts[2]?.trim() || '',
                connectedSince: parts[5]?.trim() || ''
              };
              break;
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


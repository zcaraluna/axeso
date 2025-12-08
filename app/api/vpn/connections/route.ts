import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

/**
 * Obtener token JWT del usuario desde el header Authorization
 */
function getUserIdFromToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, process.env.NEXTAUTH_SECRET || 'fallback-secret') as { userId: string };
    return decoded.userId;
  } catch {
    return null;
  }
}

/**
 * GET /api/vpn/connections
 * Obtiene el historial de conexiones VPN o verifica si hay una conexión activa
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const realIp = searchParams.get('realIp');
    const check = searchParams.get('check');
    
    // Endpoint para verificar conexión activa (usado por el middleware)
    if (check === 'true' && realIp) {
      const apiToken = request.headers.get('x-api-token');
      const expectedToken = process.env.VPN_API_TOKEN;
      
      // Verificar token de API
      if (!expectedToken || apiToken !== expectedToken) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
      }
      
      // Buscar conexión activa para esta IP pública (últimos 5 minutos)
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      const activeConnection = await prisma.vpnConnection.findFirst({
        where: {
          realIpAddress: realIp,
          connectedAt: {
            gte: fiveMinutesAgo
          },
          disconnectedAt: null
        },
        include: {
          certificate: {
            select: {
              status: true,
              certificateName: true
            }
          }
        },
        orderBy: {
          connectedAt: 'desc'
        }
      });
      
      return NextResponse.json({ 
        isActive: activeConnection !== null && activeConnection.certificate.status === 'active'
      });
    }
    
    // Endpoint normal para obtener historial (requiere autenticación)
    const userId = getUserIdFromToken(request);
    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, username: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    // Solo el usuario "garv" puede ver conexiones
    if (user.username !== 'garv') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const certificateId = searchParams.get('certificateId');

    // Mostrar todas las conexiones o filtrar por certificado
    const where: {
      certificateId?: string | { in: string[] };
    } = {};
    
    if (certificateId) {
      where.certificateId = certificateId;
    }

    const connections = await prisma.vpnConnection.findMany({
      where,
      include: {
        certificate: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                nombres: true,
                apellidos: true
              }
            }
          }
        }
      },
      orderBy: {
        connectedAt: 'desc'
      },
      take: limit
    });

    return NextResponse.json({ connections });
  } catch (error) {
    console.error('Error fetching VPN connections:', error);
    return NextResponse.json(
      { error: 'Error al obtener conexiones' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/vpn/connections
 * Registra una nueva conexión VPN (llamado desde script de OpenVPN)
 */
export async function POST(request: NextRequest) {
  try {
    // Verificar token de API (diferente del token de usuario)
    const apiToken = request.headers.get('x-api-token');
    const expectedToken = process.env.VPN_API_TOKEN;
    
    if (!expectedToken || apiToken !== expectedToken) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { certificateName, ipAddress, realIpAddress, bytesReceived = 0, bytesSent = 0 } = body;

    if (!certificateName || !ipAddress) {
      return NextResponse.json(
        { error: 'certificateName e ipAddress son requeridos' },
        { status: 400 }
      );
    }

    // Buscar certificado por nombre
    const certificate = await prisma.vpnCertificate.findUnique({
      where: { certificateName }
    });

    if (!certificate) {
      return NextResponse.json(
        { error: 'Certificado no encontrado' },
        { status: 404 }
      );
    }

    if (certificate.status !== 'active') {
      return NextResponse.json(
        { error: 'Certificado no está activo' },
        { status: 400 }
      );
    }

    // Crear registro de conexión
    const connection = await prisma.vpnConnection.create({
      data: {
        certificateId: certificate.id,
        ipAddress,
        realIpAddress: realIpAddress || null,
        bytesReceived: BigInt(bytesReceived),
        bytesSent: BigInt(bytesSent)
      }
    });

    // Actualizar última conexión del certificado
    await prisma.vpnCertificate.update({
      where: { id: certificate.id },
      data: {
        lastUsedAt: new Date(),
        ipAddress
      }
    });

    // Convertir BigInt a números para la respuesta JSON
    return NextResponse.json({ 
      connection: {
        ...connection,
        bytesReceived: connection.bytesReceived.toString(),
        bytesSent: connection.bytesSent.toString()
      }
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating VPN connection:', error);
    return NextResponse.json(
      { error: 'Error al registrar conexión' },
      { status: 500 }
    );
  }
}



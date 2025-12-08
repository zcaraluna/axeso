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
 * Obtiene el historial de conexiones VPN
 */
export async function GET(request: NextRequest) {
  try {
    const userId = getUserIdFromToken(request);
    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const certificateId = searchParams.get('certificateId');

    // Si es admin, puede ver todas las conexiones
    // Si es usuario normal, solo las de sus certificados
    const where: {
      certificateId?: string | { in: string[] };
    } = {};
    
    if (certificateId) {
      // Verificar que el certificado pertenezca al usuario (si no es admin)
      if (user.role !== 'admin') {
        const cert = await prisma.vpnCertificate.findUnique({
          where: { id: certificateId },
          select: { userId: true }
        });
        
        if (!cert || cert.userId !== userId) {
          return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
        }
      }
      where.certificateId = certificateId;
    } else if (user.role !== 'admin') {
      // Si no es admin, solo mostrar conexiones de sus certificados
      const userCertificates = await prisma.vpnCertificate.findMany({
        where: { userId },
        select: { id: true }
      });
      where.certificateId = {
        in: userCertificates.map(c => c.id)
      };
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

    return NextResponse.json({ connection }, { status: 201 });
  } catch (error) {
    console.error('Error creating VPN connection:', error);
    return NextResponse.json(
      { error: 'Error al registrar conexión' },
      { status: 500 }
    );
  }
}



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
 * GET /api/vpn/certificates/[id]
 * Obtiene un certificado específico
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const userId = getUserIdFromToken(request);
    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await context.params;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, username: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    // Solo el usuario "garv" puede acceder
    if (user.username !== 'garv') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const certificate = await prisma.vpnCertificate.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            nombres: true,
            apellidos: true
          }
        },
        connections: {
          orderBy: {
            connectedAt: 'desc'
          },
          take: 10
        }
      }
    });

    if (!certificate) {
      return NextResponse.json({ error: 'Certificado no encontrado' }, { status: 404 });
    }

    return NextResponse.json({ certificate });
  } catch (error) {
    console.error('Error fetching VPN certificate:', error);
    return NextResponse.json(
      { error: 'Error al obtener certificado' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/vpn/certificates/[id]
 * Revoca un certificado VPN
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const userId = getUserIdFromToken(request);
    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await context.params;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, username: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    // Solo el usuario "garv" puede revocar certificados
    if (user.username !== 'garv') {
      return NextResponse.json({ error: 'No autorizado. Solo el usuario garv puede revocar certificados.' }, { status: 403 });
    }

    const certificate = await prisma.vpnCertificate.findUnique({
      where: { id }
    });

    if (!certificate) {
      return NextResponse.json({ error: 'Certificado no encontrado' }, { status: 404 });
    }

    // Actualizar certificado como revocado
    const revoked = await prisma.vpnCertificate.update({
      where: { id },
      data: {
        status: 'revoked',
        revokedAt: new Date(),
        revokedBy: user.username
      }
    });

    return NextResponse.json({
      certificate: revoked,
      message: 'Certificado revocado. Debe agregarse a la lista de revocación (CRL) de OpenVPN.'
    });
  } catch (error) {
    console.error('Error revoking VPN certificate:', error);
    return NextResponse.json(
      { error: 'Error al revocar certificado' },
      { status: 500 }
    );
  }
}



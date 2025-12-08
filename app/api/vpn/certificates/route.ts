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
 * GET /api/vpn/certificates
 * Lista todos los certificados VPN (solo admin) o los del usuario actual
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

    // Si es admin, mostrar todos los certificados
    // Si es usuario normal, solo los suyos
    const where = user.role === 'admin' ? {} : { userId };

    const certificates = await prisma.vpnCertificate.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            nombres: true,
            apellidos: true
          }
        },
        _count: {
          select: {
            connections: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json({ certificates });
  } catch (error) {
    console.error('Error fetching VPN certificates:', error);
    return NextResponse.json(
      { error: 'Error al obtener certificados' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/vpn/certificates
 * Crea un nuevo certificado VPN
 */
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { targetUserId, certificateName, deviceName, location, validityDays = 365, notes } = body;

    // Solo admin puede crear certificados para otros usuarios
    const finalUserId = user.role === 'admin' && targetUserId ? targetUserId : userId;

    // Validar campos requeridos
    if (!certificateName || !/^[a-zA-Z0-9_-]{1,64}$/.test(certificateName)) {
      return NextResponse.json(
        { error: 'Nombre de certificado inválido. Solo letras, números, guiones y guiones bajos (máx 64 caracteres)' },
        { status: 400 }
      );
    }

    if (!deviceName || deviceName.trim().length === 0) {
      return NextResponse.json(
        { error: 'Nombre del dispositivo es requerido' },
        { status: 400 }
      );
    }

    // Verificar que el nombre no esté en uso
    const existing = await prisma.vpnCertificate.findUnique({
      where: { certificateName }
    });

    if (existing) {
      return NextResponse.json(
        { error: 'El nombre de certificado ya está en uso' },
        { status: 400 }
      );
    }

    // Calcular fecha de expiración
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + validityDays);

    // Crear certificado en la base de datos
    // NOTA: La generación real del certificado OpenVPN se hará con scripts externos
    const certificate = await prisma.vpnCertificate.create({
      data: {
        userId: finalUserId || null,
        certificateName,
        deviceName: deviceName.trim(),
        location: location?.trim() || null,
        commonName: certificateName,
        expiresAt,
        notes: notes || null,
        status: 'active'
      },
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
    });

    return NextResponse.json({
      certificate,
      message: 'Certificado creado. Debe generarse el archivo .ovpn usando el script de generación.'
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating VPN certificate:', error);
    return NextResponse.json(
      { error: 'Error al crear certificado' },
      { status: 500 }
    );
  }
}


import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { exec } from 'child_process';
import { promisify } from 'util';
import { readFile } from 'fs/promises';

const execAsync = promisify(exec);
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
      select: { role: true, username: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    // Solo el usuario "garv" puede acceder a esta funcionalidad
    if (user.username !== 'garv') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    // Mostrar todos los certificados
    const where = {};

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
      select: { role: true, username: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    // Solo el usuario "garv" puede crear certificados
    if (user.username !== 'garv') {
      return NextResponse.json({ error: 'No autorizado. Solo el usuario garv puede crear certificados VPN.' }, { status: 403 });
    }

    const body = await request.json();
    const { targetUserId, certificateName, deviceName, location, validityDays = 365, notes, password } = body;

    // Puede crear certificados para otros usuarios o sin asignar
    const finalUserId = targetUserId || null;

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

    // Procesar contraseña si se proporciona
    let passwordHash: string | null = null;
    const hasPassword = !!password && password.trim().length > 0;
    
    if (hasPassword) {
      // Validar longitud mínima
      if (password.length < 8) {
        return NextResponse.json(
          { error: 'La contraseña debe tener al menos 8 caracteres' },
          { status: 400 }
        );
      }
      // Hashear la contraseña
      passwordHash = await bcrypt.hash(password, 12);
    }

    // Crear certificado en la base de datos
    const certificate = await prisma.vpnCertificate.create({
      data: {
        userId: finalUserId || null,
        certificateName,
        deviceName: deviceName.trim(),
        location: location?.trim() || null,
        commonName: certificateName,
        expiresAt,
        notes: notes || null,
        status: 'active',
        hasPassword,
        passwordHash
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

    // Generar el certificado OpenVPN automáticamente
    try {
      const scriptPath = '/home/cyberpol/web/visitantes.cyberpol.com.py/public_html/scripts/vpn/generate-certificate.sh';
      const validityDaysCalc = Math.ceil((expiresAt.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
      
      // Preparar comando con contraseña si existe
      let command = `sudo bash ${scriptPath} ${certificateName} "" ${validityDaysCalc}`;
      const env: Record<string, string> = { ...process.env };
      
      if (hasPassword && password) {
        env.CERT_PASSWORD = password;
      }
      
      // Ejecutar script de generación
      const { stdout, stderr } = await execAsync(command, {
        timeout: 60000, // 60 segundos
        env
      });

      if (stderr && !stderr.includes('Generando certificado') && !stderr.includes('Usando contraseña')) {
        console.error('Error generando certificado:', stderr);
        // No fallar si el certificado ya existe o hay un warning menor
        if (!stderr.includes('ya existe') && !stderr.includes('ADVERTENCIA')) {
          // Eliminar el certificado de la BD si falla la generación
          await prisma.vpnCertificate.delete({ where: { id: certificate.id } });
          return NextResponse.json(
            { error: 'Error al generar certificado OpenVPN', details: stderr },
            { status: 500 }
          );
        }
      }

      return NextResponse.json({
        certificate,
        message: hasPassword 
          ? 'Certificado creado y generado exitosamente con contraseña. El archivo .ovpn está listo para descargar.'
          : 'Certificado creado y generado exitosamente. El archivo .ovpn está listo para descargar.'
      }, { status: 201 });
    } catch (execError: any) {
      console.error('Error ejecutando script de generación:', execError);
      // Eliminar el certificado de la BD si falla la generación
      await prisma.vpnCertificate.delete({ where: { id: certificate.id } }).catch(() => {});
      
      return NextResponse.json(
        { 
          error: 'Error al generar certificado OpenVPN', 
          details: execError.message,
          note: 'El certificado fue creado en la BD pero falló la generación del archivo .ovpn. Puedes generarlo manualmente con el script.'
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error creating VPN certificate:', error);
    return NextResponse.json(
      { error: 'Error al crear certificado' },
      { status: 500 }
    );
  }
}


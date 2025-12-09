import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFile, unlink } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

const execAsync = promisify(exec);

/**
 * POST /api/vpn/certificates/[id]/generate
 * Genera el archivo .ovpn para un certificado existente
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const certificate = await prisma.vpnCertificate.findUnique({
      where: { id },
    });

    if (!certificate) {
      return NextResponse.json(
        { error: 'Certificado no encontrado' },
        { status: 404 }
      );
    }

    // Verificar que el certificado no esté revocado
    if (certificate.status === 'revoked') {
      return NextResponse.json(
        { error: 'No se puede generar un certificado revocado' },
        { status: 400 }
      );
    }

    // Preparar contraseña si existe
    let passwordFile: string | null = null;
    let password: string | null = null;

    if (certificate.hasPassword && certificate.passwordHash) {
      // Si tiene contraseña, necesitamos que el usuario la proporcione
      // Por ahora, generamos sin contraseña y el usuario debe usar el script manualmente
      // TODO: Implementar endpoint para verificar contraseña y generar con ella
      return NextResponse.json(
        { 
          error: 'Los certificados con contraseña deben generarse manualmente usando el script',
          instructions: 'Ejecuta: sudo bash scripts/vpn/generate-certificate.sh ' + certificate.certificateName
        },
        { status: 400 }
      );
    }

    // Ejecutar script de generación
    const scriptPath = '/home/cyberpol/web/visitantes.cyberpol.com.py/public_html/scripts/vpn/generate-certificate.sh';
    const command = `sudo bash ${scriptPath} ${certificate.certificateName} "" ${Math.ceil((certificate.expiresAt.getTime() - certificate.issuedAt.getTime()) / (1000 * 60 * 60 * 24))}`;

    try {
      const { stdout, stderr } = await execAsync(command, {
        timeout: 60000, // 60 segundos
        env: {
          ...process.env,
          // Si hay contraseña, pasarla de forma segura
          ...(password ? { CERT_PASSWORD: password } : {})
        }
      });

      if (stderr && !stderr.includes('Generando certificado')) {
        console.error('Error generando certificado:', stderr);
        return NextResponse.json(
          { error: 'Error al generar certificado', details: stderr },
          { status: 500 }
        );
      }

      // Leer el archivo .ovpn generado
      const ovpnPath = `/etc/openvpn/client-configs/${certificate.certificateName}.ovpn`;
      const { readFile } = await import('fs/promises');
      
      try {
        const ovpnContent = await readFile(ovpnPath, 'utf-8');
        
        return NextResponse.json({
          success: true,
          certificateName: certificate.certificateName,
          message: 'Certificado generado exitosamente',
          // No enviamos el contenido por seguridad, el usuario debe descargarlo
        }, { status: 200 });
      } catch (readError) {
        return NextResponse.json(
          { error: 'Certificado generado pero no se pudo leer el archivo', details: readError instanceof Error ? readError.message : 'Unknown' },
          { status: 500 }
        );
      }
    } catch (execError: any) {
      console.error('Error ejecutando script:', execError);
      return NextResponse.json(
        { error: 'Error al ejecutar script de generación', details: execError.message },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error generating certificate:', error);
    return NextResponse.json(
      { error: 'Error al generar certificado' },
      { status: 500 }
    );
  }
}


import { NextRequest, NextResponse } from 'next/server';
import { validarCodigoActivacion } from '@/lib/auth';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { codigo, screenWidth, screenHeight, timezone, language, platform, hardwareConcurrency } = body;

    if (!codigo || typeof codigo !== 'string' || codigo.trim() === '') {
      return NextResponse.json(
        { error: 'El código de activación es requerido' },
        { status: 400 }
      );
    }

    // Obtener información del dispositivo desde headers
    const userAgent = request.headers.get('user-agent') || '';
    const acceptLanguage = request.headers.get('accept-language') || language || '';
    const acceptEncoding = request.headers.get('accept-encoding') || '';
    const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0] || 
                     request.headers.get('x-real-ip') || 
                     'desconocido';

    // Combinar información del cliente para hacer el fingerprint más único
    const clientInfo = [
      userAgent,
      acceptLanguage,
      acceptEncoding,
      screenWidth ? String(screenWidth) : '',
      screenHeight ? String(screenHeight) : '',
      timezone || '',
      platform || '',
      hardwareConcurrency ? String(hardwareConcurrency) : '',
      ipAddress,
    ].join('|');

    // Generar fingerprint del dispositivo usando múltiples factores
    const fingerprint = crypto.createHash('sha256').update(clientInfo).digest('hex');

    // Validar el código
    const resultado = await validarCodigoActivacion(
      codigo.trim().toUpperCase(),
      fingerprint,
      userAgent,
      ipAddress
    );

    if (!resultado.valido) {
      return NextResponse.json(
        { error: resultado.mensaje || 'Código de activación inválido' },
        { status: 401 }
      );
    }

    // Retornar éxito con el fingerprint y establecer cookie
    const response = NextResponse.json({
      success: true,
      mensaje: 'Dispositivo autorizado correctamente',
      fingerprint: fingerprint,
    });

    // Establecer cookie con el fingerprint (válida por 1 año)
    response.cookies.set('device_fingerprint', fingerprint, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 365 * 24 * 60 * 60, // 1 año
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Error en autenticación de dispositivo:', error);
    return NextResponse.json(
      { error: 'Error del servidor al procesar la autenticación' },
      { status: 500 }
    );
  }
}


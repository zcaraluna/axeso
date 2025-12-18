import { NextRequest, NextResponse } from 'next/server';
import { validarCodigoActivacion, generarFingerprint } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { codigo } = await request.json();

    if (!codigo || typeof codigo !== 'string' || codigo.trim() === '') {
      return NextResponse.json(
        { error: 'El código de activación es requerido' },
        { status: 400 }
      );
    }

    // Obtener información del dispositivo
    const userAgent = request.headers.get('user-agent') || '';
    const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0] || 
                     request.headers.get('x-real-ip') || 
                     'desconocido';

    // Generar fingerprint del dispositivo
    const fingerprint = generarFingerprint(userAgent);

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


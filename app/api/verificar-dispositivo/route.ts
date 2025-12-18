import { NextRequest, NextResponse } from 'next/server';
import { verificarDispositivoAutorizado, generarFingerprint } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { fingerprint } = await request.json();

    if (!fingerprint || typeof fingerprint !== 'string') {
      return NextResponse.json(
        { error: 'Fingerprint requerido' },
        { status: 400 }
      );
    }

    const estaAutorizado = await verificarDispositivoAutorizado(fingerprint);

    if (!estaAutorizado) {
      return NextResponse.json(
        { error: 'Dispositivo no autorizado' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      autorizado: true,
    });
  } catch (error) {
    console.error('Error verificando dispositivo:', error);
    return NextResponse.json(
      { error: 'Error del servidor' },
      { status: 500 }
    );
  }
}

// GET endpoint para verificar usando la cookie del request
export async function GET(request: NextRequest) {
  try {
    const fingerprintCookie = request.cookies.get('device_fingerprint')?.value;
    
    if (!fingerprintCookie) {
      return NextResponse.json({
        autorizado: false,
        fingerprint: null,
      });
    }

    const estaAutorizado = await verificarDispositivoAutorizado(fingerprintCookie);

    if (!estaAutorizado) {
      const response = NextResponse.json({
        autorizado: false,
        fingerprint: fingerprintCookie,
      });
      response.cookies.delete('device_fingerprint');
      return response;
    }

    return NextResponse.json({
      autorizado: true,
      fingerprint: fingerprintCookie,
    });
  } catch (error) {
    console.error('Error verificando dispositivo:', error);
    return NextResponse.json(
      { error: 'Error del servidor', autorizado: false, fingerprint: null },
      { status: 500 }
    );
  }
}


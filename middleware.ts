import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Middleware para verificar autorización de dispositivos
 * 
 * Verifica que el dispositivo tenga la cookie de autorización.
 * La validación real contra la base de datos se hace en las rutas API protegidas.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Rutas que NO requieren autorización de dispositivo
  const rutasPublicas = [
    '/autenticar',
    '/api/autenticar',
    '/api/verificar-dispositivo',
    '/api/auth/login',
    '/api/debug-ip',
  ];

  // Verificar si es una ruta pública
  const esRutaPublica = rutasPublicas.some(ruta => 
    pathname === ruta || pathname.startsWith(ruta)
  );

  if (esRutaPublica) {
    return NextResponse.next();
  }

  // Obtener el fingerprint de la cookie
  const fingerprint = request.cookies.get('device_fingerprint')?.value;

  // Si no tiene fingerprint, redirigir a /autenticar
  if (!fingerprint) {
    if (pathname !== '/autenticar') {
      const url = request.nextUrl.clone();
      url.pathname = '/autenticar';
      return NextResponse.redirect(url);
    }
  }

  // Permitir el acceso - la validación real se hace en las rutas API
  return NextResponse.next();
}

// Configurar qué rutas deben pasar por el middleware
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};



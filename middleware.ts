import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Middleware básico
 */
export async function middleware(request: NextRequest) {
  try {
    return NextResponse.next();
  } catch (error) {
    console.error(`[Middleware] ERROR:`, error);
    return NextResponse.next();
  }
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



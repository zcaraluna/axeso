import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { isVpnConnected, getClientIp } from './lib/vpn-utils';

/**
 * Middleware para verificar conexión VPN
 * 
 * Si VPN_REQUIRED está habilitado, solo permite acceso desde IPs de la red VPN
 * Excepciones: rutas públicas, API de autenticación, y página de configuración VPN
 */
export function middleware(request: NextRequest) {
  // Verificar si la verificación VPN está habilitada
  const vpnRequired = process.env.VPN_REQUIRED === 'true';
  
  if (!vpnRequired) {
    // Si no está habilitado, permitir todo el tráfico
    return NextResponse.next();
  }

  const pathname = request.nextUrl.pathname;
  
  // Rutas que no requieren VPN
  const publicPaths = [
    '/',
    '/api/auth/login',
    '/vpn-setup',
    '/vpn-instructions',
    '/_next',
    '/favicon.ico',
    '/api/vpn/connections' // Endpoint para registrar conexiones (usa token API)
  ];

  // Verificar si la ruta es pública
  const isPublicPath = publicPaths.some(path => 
    pathname === path || pathname.startsWith(path)
  );

  if (isPublicPath) {
    return NextResponse.next();
  }

  // Verificar conexión VPN
  const clientIp = getClientIp(request);
  const isConnected = isVpnConnected(request);
  const vpnRange = process.env.VPN_RANGE || '10.8.0.0/24';

  // Logging para debugging (solo en producción para ver qué está pasando)
  if (process.env.NODE_ENV === 'production') {
    console.log(`[VPN Middleware] Path: ${pathname}, IP: ${clientIp}, VPN Range: ${vpnRange}, Connected: ${isConnected}`);
  }

  if (!isConnected) {
    // Redirigir a página de instrucciones VPN
    const url = request.nextUrl.clone();
    url.pathname = '/vpn-setup';
    url.searchParams.set('redirect', pathname);
    url.searchParams.set('ip', clientIp);
    
    console.log(`[VPN Middleware] Bloqueando acceso - IP: ${clientIp} no está en rango VPN ${vpnRange}`);
    return NextResponse.redirect(url);
  }

  // Agregar header con información de VPN para debugging (solo en desarrollo)
  if (process.env.NODE_ENV === 'development') {
    const response = NextResponse.next();
    response.headers.set('X-VPN-IP', clientIp);
    response.headers.set('X-VPN-Status', 'connected');
    return response;
  }

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



import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { isVpnConnected, getClientIp } from './lib/vpn-utils';

/**
 * Middleware para verificar conexión VPN
 * 
 * Si VPN_REQUIRED está habilitado, solo permite acceso desde IPs de la red VPN
 * Excepciones: rutas públicas, API de autenticación, y página de configuración VPN
 */
export async function middleware(request: NextRequest) {
  // Logging inicial para verificar que el middleware se ejecuta
  // IMPORTANTE: Este log debe aparecer SIEMPRE, incluso si hay errores
  try {
    const pathname = request.nextUrl.pathname;
    console.log(`[VPN Middleware] INICIO - Path: ${pathname}`);
    
    // Verificar si la verificación VPN está habilitada
    // En Edge Runtime, las variables de entorno pueden no estar disponibles
    // Si no está disponible o es cualquier valor distinto de 'true', permitir acceso
    const vpnRequiredEnv = process.env.VPN_REQUIRED;
    const vpnRequired = vpnRequiredEnv === 'true';
    console.log(`[VPN Middleware] VPN_REQUIRED env=${vpnRequiredEnv}, parsed=${vpnRequired}`);
  
    // Si VPN_REQUIRED no es exactamente 'true', permitir todo el tráfico
    // Esto incluye: undefined, null, 'false', '', o cualquier otro valor
    if (!vpnRequired) {
      // Si no está habilitado, permitir todo el tráfico
      console.log(`[VPN Middleware] VPN no requerido (env=${vpnRequiredEnv}), permitiendo acceso`);
      return NextResponse.next();
    }

    // Rutas que no requieren VPN
    // SOLO permitir página de aviso y archivos estáticos
    // TODO LO DEMÁS requiere VPN (incluyendo /login, /api/auth/login, etc.)
    const isPublicPath = 
      pathname === '/favicon.ico' ||
      pathname.startsWith('/vpn-setup') ||
      pathname.startsWith('/_next/') ||
      pathname.startsWith('/api/vpn/connections') || // Para registrar conexiones desde OpenVPN
      pathname.startsWith('/api/debug-ip'); // Para debugging

    if (isPublicPath) {
      console.log(`[VPN Middleware] Ruta pública, permitiendo acceso: ${pathname}`);
      return NextResponse.next();
    }

    // Verificar conexión VPN
    const clientIp = getClientIp(request);
    const isConnected = await isVpnConnected(request);
    const vpnRange = process.env.VPN_RANGE || '10.8.0.0/24';

    // Logging para debugging
    console.log(`[VPN Middleware] Path: ${pathname}, IP: ${clientIp}, VPN Range: ${vpnRange}, Connected: ${isConnected}`);

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

    console.log(`[VPN Middleware] Acceso permitido - IP: ${clientIp} está en rango VPN`);
    return NextResponse.next();
  } catch (error) {
    // Si hay un error, loguearlo pero permitir el acceso para no romper la aplicación
    console.error(`[VPN Middleware] ERROR:`, error);
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



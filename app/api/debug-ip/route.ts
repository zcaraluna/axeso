import { NextRequest, NextResponse } from 'next/server';
import { getClientIp, isVpnConnected } from '@/lib/vpn-utils';

/**
 * Endpoint de debug para verificar qué IP está recibiendo el middleware
 * Útil para diagnosticar problemas con la verificación VPN
 */
export async function GET(request: NextRequest) {
  const clientIp = getClientIp(request);
  const isVpn = await isVpnConnected(request);
  const vpnRange = process.env.VPN_RANGE || '10.8.0.0/24';

  const headers = {
    'x-real-ip': request.headers.get('x-real-ip'),
    'x-forwarded-for': request.headers.get('x-forwarded-for'),
    'cf-connecting-ip': request.headers.get('cf-connecting-ip'),
    'remote-addr': request.headers.get('remote-addr'),
  };

  // Obtener información adicional del estado VPN
  let vpnStatusInfo = null;
  try {
    const apiUrl = process.env.VPN_API_URL || 'http://127.0.0.1:3000';
    const checkUrl = `${apiUrl}/api/vpn/check-status?realIp=${encodeURIComponent(clientIp)}`;
    const statusResponse = await fetch(checkUrl, {
      cache: 'no-store',
      signal: AbortSignal.timeout(2000),
    });
    if (statusResponse.ok) {
      vpnStatusInfo = await statusResponse.json();
    }
  } catch (error) {
    // Ignorar errores de timeout
  }

  const response = NextResponse.json({
    detectedIp: clientIp,
    isVpnConnected: isVpn,
    vpnRange,
    headers,
    vpnRequired: process.env.VPN_REQUIRED,
    nodeEnv: process.env.NODE_ENV,
    vpnStatusInfo,
    timestamp: new Date().toISOString(),
  });

  // Agregar headers para evitar caché
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');

  return response;
}


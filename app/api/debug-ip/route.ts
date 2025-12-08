import { NextRequest, NextResponse } from 'next/server';
import { getClientIp, isVpnConnected } from '@/lib/vpn-utils';

/**
 * Endpoint de debug para verificar qué IP está recibiendo el middleware
 * Útil para diagnosticar problemas con la verificación VPN
 */
export async function GET(request: NextRequest) {
  const clientIp = getClientIp(request);
  const isVpn = isVpnConnected(request);
  const vpnRange = process.env.VPN_RANGE || '10.8.0.0/24';

  const headers = {
    'x-real-ip': request.headers.get('x-real-ip'),
    'x-forwarded-for': request.headers.get('x-forwarded-for'),
    'cf-connecting-ip': request.headers.get('cf-connecting-ip'),
    'remote-addr': request.headers.get('remote-addr'),
  };

  return NextResponse.json({
    detectedIp: clientIp,
    isVpnConnected: isVpn,
    vpnRange,
    headers,
    vpnRequired: process.env.VPN_REQUIRED,
    nodeEnv: process.env.NODE_ENV,
  });
}


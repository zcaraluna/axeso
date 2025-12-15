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
  const vpnRequiredEnv = process.env.VPN_REQUIRED;
  const vpnRequired = vpnRequiredEnv === 'true';

  // Obtener el hostname actual
  const hostname = request.headers.get('host') || request.nextUrl.hostname;
  let currentHost = hostname.toLowerCase();
  
  // Si es localhost o IP, usar NEXT_PUBLIC_SITE_URL para obtener el dominio real
  const isLocalhostOrIp = currentHost.startsWith('localhost') || 
                          currentHost.startsWith('127.0.0.1') || 
                          currentHost === 'localhost' ||
                          (currentHost.includes(':') && (currentHost.startsWith('localhost') || currentHost.startsWith('127.0.0.1') || /^\d+\.\d+\.\d+\.\d+/.test(currentHost)));
  
  if (isLocalhostOrIp) {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_URL_BASE;
    if (siteUrl) {
      try {
        const url = new URL(siteUrl);
        currentHost = url.hostname.toLowerCase();
      } catch (e) {
        // Si no se puede parsear, usar el hostname original
      }
    }
  }

  // Verificar si este dominio específico requiere VPN
  let domainRequiresVpn = false;
  if (vpnRequired) {
    const vpnRequiredDomains = process.env.VPN_REQUIRED_DOMAINS;
    if (vpnRequiredDomains) {
      const allowedDomains = vpnRequiredDomains.split(',').map(d => d.trim().toLowerCase());
      domainRequiresVpn = allowedDomains.some(domain => 
        currentHost === domain || currentHost.endsWith('.' + domain)
      );
    } else {
      // Si VPN_REQUIRED=true pero no hay VPN_REQUIRED_DOMAINS, todos los dominios requieren VPN
      domainRequiresVpn = true;
    }
  }

  const headers = {
    'x-real-ip': request.headers.get('x-real-ip'),
    'x-forwarded-for': request.headers.get('x-forwarded-for'),
    'cf-connecting-ip': request.headers.get('cf-connecting-ip'),
    'remote-addr': request.headers.get('remote-addr'),
    'host': hostname,
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
    vpnRequired: vpnRequiredEnv,
    vpnRequiredParsed: vpnRequired,
    domainRequiresVpn: domainRequiresVpn,
    currentHost: currentHost,
    originalHostname: hostname,
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


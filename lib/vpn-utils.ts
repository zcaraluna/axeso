/**
 * Utilidades para verificación y gestión de VPN
 */

/**
 * Verifica si una IP está en el rango de la red VPN
 * Por defecto, OpenVPN usa 10.8.0.0/24
 */
export function isIpInVpnRange(ip: string, vpnRange: string = '10.8.0.0/24'): boolean {
  if (!ip || ip === 'unknown' || ip === '::1' || ip === '127.0.0.1') {
    // Permitir localhost para desarrollo
    return process.env.NODE_ENV === 'development';
  }

  const [rangeIp, prefixLength] = vpnRange.split('/');
  const mask = parseInt(prefixLength, 10);
  
  const ipToNumber = (ip: string): number => {
    return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
  };

  const rangeNum = ipToNumber(rangeIp);
  const ipNum = ipToNumber(ip);
  const maskNum = (0xffffffff << (32 - mask)) >>> 0;

  return (ipNum & maskNum) === (rangeNum & maskNum);
}

/**
 * Extrae la IP real del cliente desde los headers de la request
 */
export function getClientIp(request: Request): string {
  // Intentar obtener IP desde varios headers comunes (en orden de prioridad)
  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }

  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    // x-forwarded-for puede contener múltiples IPs, tomar la primera (IP original del cliente)
    const ips = forwardedFor.split(',').map(ip => ip.trim());
    return ips[0];
  }

  const cfConnectingIp = request.headers.get('cf-connecting-ip'); // Cloudflare
  if (cfConnectingIp) {
    return cfConnectingIp.trim();
  }

  // Si no hay headers, intentar desde la conexión directa (solo en desarrollo)
  return 'unknown';
}

/**
 * Verifica si el cliente está conectado a través de VPN
 */
export function isVpnConnected(request: Request): boolean {
  const clientIp = getClientIp(request);
  const vpnRange = process.env.VPN_RANGE || '10.8.0.0/24';
  return isIpInVpnRange(clientIp, vpnRange);
}

/**
 * Valida el formato de un nombre de certificado
 */
export function isValidCertificateName(name: string): boolean {
  // Solo letras, números, guiones y guiones bajos, máximo 64 caracteres
  const regex = /^[a-zA-Z0-9_-]{1,64}$/;
  return regex.test(name);
}

/**
 * Calcula la fecha de expiración de un certificado (por defecto 1 año)
 */
export function calculateExpirationDate(validityDays: number = 365): Date {
  const expirationDate = new Date();
  expirationDate.setDate(expirationDate.getDate() + validityDays);
  return expirationDate;
}



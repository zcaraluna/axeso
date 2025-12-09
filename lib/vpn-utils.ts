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
 * Primero verifica si la IP está en el rango VPN
 * Si no, verifica si hay una conexión activa registrada en la base de datos
 */
export async function isVpnConnected(request: Request): Promise<boolean> {
  const clientIp = getClientIp(request);
  const vpnRange = process.env.VPN_RANGE || '10.8.0.0/24';
  
  // Primero verificar si la IP está en el rango VPN (método directo y rápido)
  if (isIpInVpnRange(clientIp, vpnRange)) {
    return true;
  }
  
  // Si no está en el rango VPN, verificar si hay una conexión activa registrada
  // para esta IP pública (útil cuando redirect-gateway no funciona)
  // Esto requiere acceso a la base de datos, que se hace a través de un endpoint interno
  try {
    const apiToken = process.env.VPN_API_TOKEN;
    
    if (!apiToken) {
      // Si no hay token configurado, solo verificar por IP
      return false;
    }
    
    // Usar URL absoluta con localhost para evitar problemas de DNS
    // El endpoint /api/vpn/connections está en la lista de rutas públicas del middleware
    const apiUrl = process.env.VPN_API_URL || 'http://127.0.0.1:3000';
    const checkUrl = `${apiUrl}/api/vpn/connections?check=true&realIp=${encodeURIComponent(clientIp)}`;
    
    // Crear un nuevo Request para evitar problemas con el request original
    const checkRequest = new Request(checkUrl, {
      method: 'GET',
      headers: {
        'X-API-Token': apiToken,
        'Host': new URL(apiUrl).host,
      },
    });
    
    // Hacer llamada a la API para verificar conexión activa
    // Usar fetch con timeout manual porque AbortSignal.timeout puede no estar disponible
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1500);
    
    try {
      const response = await fetch(checkRequest, {
        signal: controller.signal,
        cache: 'no-store',
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`[VPN Utils] Verificación para IP ${clientIp}:`, data);
        return data.isActive === true;
      } else {
        console.error(`[VPN Utils] Error en respuesta: ${response.status} ${response.statusText}`);
      }
    } catch (fetchError) {
      clearTimeout(timeoutId);
      // Si es un error de abort (timeout), no loguear como error
      if (fetchError instanceof Error && fetchError.name !== 'AbortError') {
        throw fetchError;
      }
    }
  } catch (error) {
    // Si hay error, solo loguear y continuar con verificación por IP
    console.error('[VPN Utils] Error verificando conexión activa:', error);
  }
  
  return false;
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



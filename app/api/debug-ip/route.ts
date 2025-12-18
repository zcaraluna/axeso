import { NextRequest, NextResponse } from 'next/server';

/**
 * Endpoint de debug para verificar qué IP está recibiendo el servidor
 */
export async function GET(request: NextRequest) {
  // Obtener IP del cliente desde headers
  const clientIp = 
    request.headers.get('x-real-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('cf-connecting-ip') ||
    'unknown';

  const hostname = request.headers.get('host') || request.nextUrl.hostname;

  const headers = {
    'x-real-ip': request.headers.get('x-real-ip'),
    'x-forwarded-for': request.headers.get('x-forwarded-for'),
    'cf-connecting-ip': request.headers.get('cf-connecting-ip'),
    'remote-addr': request.headers.get('remote-addr'),
    'host': hostname,
  };

  const response = NextResponse.json({
    detectedIp: clientIp,
    headers,
    currentHost: hostname,
    nodeEnv: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });

  // Agregar headers para evitar caché
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');

  return response;
}


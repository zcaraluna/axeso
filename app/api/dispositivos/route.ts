import { NextRequest, NextResponse } from 'next/server';
import { obtenerDispositivosAutorizados, obtenerCodigosActivacion, desactivarDispositivo, desactivarCodigoActivacion, generarCodigoActivacion } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

/**
 * Verificar token y obtener usuario con rol
 */
async function verificarUsuarioAdmin(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.error('[API Dispositivos] No se encontró header de autorización');
    return null;
  }

  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, process.env.NEXTAUTH_SECRET || 'fallback-secret') as { userId: string };
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, username: true, role: true, isActive: true }
    });

    if (!user) {
      console.error('[API Dispositivos] Usuario no encontrado:', decoded.userId);
      return null;
    }

    if (!user.isActive) {
      console.error('[API Dispositivos] Usuario inactivo:', user.username);
      return null;
    }

    if (user.role !== 'admin') {
      console.error('[API Dispositivos] Usuario no es admin:', user.username, 'rol:', user.role);
      return null;
    }

    return user;
  } catch (error) {
    console.error('[API Dispositivos] Error verificando token:', error);
    return null;
  }
}

// GET: Obtener todos los dispositivos y códigos
export async function GET(request: NextRequest) {
  try {
    // Verificar autenticación y que sea admin
    const user = await verificarUsuarioAdmin(request);
    if (!user) {
      return NextResponse.json(
        { error: 'No autorizado. Solo administradores pueden acceder.' },
        { status: 403 }
      );
    }

    const [dispositivos, codigos] = await Promise.all([
      obtenerDispositivosAutorizados(),
      obtenerCodigosActivacion(),
    ]);

    // Calcular días restantes para códigos no usados
    const codigosConDiasRestantes = codigos.map((codigo: any) => {
      let diasRestantes = null;
      if (!codigo.usado && codigo.expira_en) {
        const fechaExpiracion = new Date(codigo.expira_en);
        const ahora = new Date();
        const diferencia = fechaExpiracion.getTime() - ahora.getTime();
        diasRestantes = Math.ceil(diferencia / (1000 * 60 * 60 * 24));
      }
      return {
        ...codigo,
        dias_restantes: diasRestantes,
        esta_expirado: codigo.expira_en ? new Date(codigo.expira_en) < new Date() : false,
      };
    });

    return NextResponse.json({
      dispositivos,
      codigos: codigosConDiasRestantes,
    });
  } catch (error) {
    console.error('Error obteniendo dispositivos y códigos:', error);
    return NextResponse.json(
      { error: 'Error del servidor' },
      { status: 500 }
    );
  }
}

// POST: Desactivar dispositivo o código, o generar nuevo código
export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación y que sea admin
    const user = await verificarUsuarioAdmin(request);
    if (!user) {
      return NextResponse.json(
        { error: 'No autorizado. Solo administradores pueden acceder.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { tipo, id, diasExpiracion, nombre } = body;

    // Generar nuevo código - SOLO usuario garv
    if (tipo === 'generar_codigo') {
      if (user.username !== 'garv') {
        return NextResponse.json(
          { error: 'No autorizado. Solo el usuario garv puede generar códigos.' },
          { status: 403 }
        );
      }
      
      const codigo = await generarCodigoActivacion(
        diasExpiracion || 30,
        nombre || null
      );
      return NextResponse.json({ 
        success: true, 
        codigo,
        mensaje: 'Código generado exitosamente'
      });
    }

    if (!tipo || !id) {
      return NextResponse.json(
        { error: 'Tipo e ID son requeridos' },
        { status: 400 }
      );
    }

    let resultado = false;
    if (tipo === 'dispositivo') {
      resultado = await desactivarDispositivo(id);
    } else if (tipo === 'codigo') {
      resultado = await desactivarCodigoActivacion(id);
    } else {
      return NextResponse.json(
        { error: 'Tipo inválido. Debe ser "dispositivo", "codigo" o "generar_codigo"' },
        { status: 400 }
      );
    }

    if (resultado) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json(
        { error: 'Error al desactivar' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error procesando solicitud:', error);
    return NextResponse.json(
      { error: 'Error del servidor' },
      { status: 500 }
    );
  }
}


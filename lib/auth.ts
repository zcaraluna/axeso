import { prisma } from './prisma';
import crypto from 'crypto';

/**
 * Genera un fingerprint único para un dispositivo basado en múltiples factores
 * Incluye: user agent, accept-language, accept-encoding, y otros headers disponibles
 */
export function generarFingerprint(
  userAgent: string, 
  acceptLanguage?: string,
  acceptEncoding?: string,
  ipAddress?: string
): string {
  // Combinar múltiples factores para hacer el fingerprint más único
  const factors = [
    userAgent,
    acceptLanguage || '',
    acceptEncoding || '',
    // Incluir IP como factor adicional (aunque puede cambiar, ayuda a diferenciar)
    ipAddress || '',
  ].join('|');
  
  return crypto.createHash('sha256').update(factors).digest('hex');
}

/**
 * Valida un código de activación y lo marca como usado
 */
export async function validarCodigoActivacion(
  codigo: string,
  fingerprint: string,
  userAgent: string,
  ipAddress?: string
): Promise<{ valido: boolean; mensaje?: string }> {
  try {
    // Normalizar el código ingresado (eliminar guiones y convertir a mayúsculas)
    const codigoNormalizado = codigo.replace(/-/g, '').toUpperCase();
    
    // Buscar el código normalizando ambos lados
    const codigos = await prisma.codigoActivacion.findMany({
      where: {
        activo: true,
      },
    });

    // Buscar el código que coincida después de normalizar
    const codigoActivacion = codigos.find(c => 
      c.codigo.replace(/-/g, '').toUpperCase() === codigoNormalizado
    );

    if (!codigoActivacion) {
      return { valido: false, mensaje: 'Código de activación inválido' };
    }

    // Verificar si el código está activo
    if (codigoActivacion.activo === false) {
      return { valido: false, mensaje: 'Este código ha sido desactivado' };
    }

    // Verificar si ya fue usado
    if (codigoActivacion.usado) {
      return { valido: false, mensaje: 'Este código ya fue utilizado' };
    }

    // Verificar expiración
    if (codigoActivacion.expiraEn && new Date(codigoActivacion.expiraEn) < new Date()) {
      return { valido: false, mensaje: 'Este código ha expirado' };
    }

    // Verificar si el dispositivo ya está autorizado
    const dispositivoExistente = await prisma.dispositivoAutorizado.findUnique({
      where: { fingerprint },
    });

    // Usar transacción para asegurar atomicidad
    await prisma.$transaction(async (tx) => {
      // Marcar código como usado
      await tx.codigoActivacion.update({
        where: { id: codigoActivacion.id },
        data: {
          usado: true,
          usadoEn: new Date(),
          dispositivoFingerprint: fingerprint,
        },
      });

      if (dispositivoExistente) {
        // Dispositivo ya existe, actualizar (reautorización)
        await tx.dispositivoAutorizado.update({
          where: { id: dispositivoExistente.id },
          data: {
            userAgent: userAgent,
            ipAddress: ipAddress || null,
            codigoActivacionId: codigoActivacion.id,
            nombre: codigoActivacion.nombre || dispositivoExistente.nombre,
            autorizadoEn: new Date(),
            ultimoAcceso: new Date(),
            activo: true,
          },
        });
      } else {
        // Nuevo dispositivo, insertarlo
        await tx.dispositivoAutorizado.create({
          data: {
            fingerprint,
            userAgent: userAgent,
            ipAddress: ipAddress || null,
            codigoActivacionId: codigoActivacion.id,
            nombre: codigoActivacion.nombre || null,
          },
        });
      }
    });

    return { valido: true };
  } catch (error) {
    console.error('Error validando código de activación:', error);
    return { valido: false, mensaje: 'Error del servidor al validar el código' };
  }
}

/**
 * Verifica si un dispositivo está autorizado
 * También verifica si el código asociado ha expirado
 */
export async function verificarDispositivoAutorizado(
  fingerprint: string
): Promise<boolean> {
  try {
    const dispositivo = await prisma.dispositivoAutorizado.findUnique({
      where: { fingerprint },
      include: {
        codigoActivacion: true,
      },
    });

    if (!dispositivo || !dispositivo.activo) {
      return false;
    }

    // Si el dispositivo tiene un código asociado, verificar si ha expirado
    if (dispositivo.codigoActivacion) {
      const codigo = dispositivo.codigoActivacion;
      
      // Verificar si el código ha expirado
      if (codigo.expiraEn && new Date(codigo.expiraEn) < new Date()) {
        // El código ha expirado, desactivar el dispositivo automáticamente
        await prisma.dispositivoAutorizado.update({
          where: { id: dispositivo.id },
          data: { activo: false },
        });
        return false;
      }

      // Verificar si el código está activo
      if (codigo.activo === false) {
        // El código fue desactivado, desactivar el dispositivo también
        await prisma.dispositivoAutorizado.update({
          where: { id: dispositivo.id },
          data: { activo: false },
        });
        return false;
      }
    }

    // Actualizar último acceso
    await prisma.dispositivoAutorizado.update({
      where: { id: dispositivo.id },
      data: { ultimoAcceso: new Date() },
    });
    
    return true;
  } catch (error) {
    console.error('Error verificando dispositivo autorizado:', error);
    return false;
  }
}

/**
 * Genera un código de activación nuevo
 */
export async function generarCodigoActivacion(
  diasExpiracion: number = 30,
  nombre?: string,
  creadoPor?: string
): Promise<string> {
  try {
    const codigo = crypto.randomBytes(16).toString('hex').toUpperCase();

    const fechaExpiracion = new Date();
    fechaExpiracion.setDate(fechaExpiracion.getDate() + diasExpiracion);

    await prisma.codigoActivacion.create({
      data: {
        codigo,
        expiraEn: fechaExpiracion,
        nombre: nombre || null,
        creadoPor: creadoPor || null,
      },
    });

    return codigo;
  } catch (error) {
    console.error('Error generando código de activación:', error);
    throw error;
  }
}

/**
 * Desactiva un código de activación
 */
export async function desactivarCodigoActivacion(codigoId: string): Promise<boolean> {
  try {
    await prisma.codigoActivacion.update({
      where: { id: codigoId },
      data: { activo: false },
    });
    return true;
  } catch (error) {
    console.error('Error desactivando código de activación:', error);
    return false;
  }
}

/**
 * Desactiva un dispositivo autorizado
 */
export async function desactivarDispositivo(dispositivoId: string): Promise<boolean> {
  try {
    await prisma.dispositivoAutorizado.update({
      where: { id: dispositivoId },
      data: { activo: false },
    });
    return true;
  } catch (error) {
    console.error('Error desactivando dispositivo:', error);
    return false;
  }
}

/**
 * Elimina permanentemente un código de activación
 * Si el código está usado, también desactiva los dispositivos asociados
 */
export async function eliminarCodigoActivacion(codigoId: string): Promise<{ success: boolean; dispositivosAfectados: number }> {
  try {
    // Primero, obtener el código para verificar si está usado
    const codigo = await prisma.codigoActivacion.findUnique({
      where: { id: codigoId },
      include: {
        dispositivos: true,
      },
    });

    if (!codigo) {
      return { success: false, dispositivosAfectados: 0 };
    }

    // Si el código está usado y tiene dispositivos asociados, desactivarlos
    let dispositivosAfectados = 0;
    if (codigo.usado && codigo.dispositivos.length > 0) {
      await prisma.dispositivoAutorizado.updateMany({
        where: {
          codigoActivacionId: codigoId,
        },
        data: {
          activo: false,
        },
      });
      dispositivosAfectados = codigo.dispositivos.length;
    }

    // Eliminar el código
    await prisma.codigoActivacion.delete({
      where: { id: codigoId },
    });

    return { success: true, dispositivosAfectados };
  } catch (error) {
    console.error('Error eliminando código de activación:', error);
    return { success: false, dispositivosAfectados: 0 };
  }
}

/**
 * Elimina permanentemente un dispositivo autorizado
 */
export async function eliminarDispositivo(dispositivoId: string): Promise<boolean> {
  try {
    await prisma.dispositivoAutorizado.delete({
      where: { id: dispositivoId },
    });
    return true;
  } catch (error) {
    console.error('Error eliminando dispositivo:', error);
    return false;
  }
}

/**
 * Obtiene todos los dispositivos autorizados
 */
export async function obtenerDispositivosAutorizados() {
  try {
    // Obtener TODOS los dispositivos sin ningún filtro
    const dispositivos = await prisma.dispositivoAutorizado.findMany({
      include: {
        codigoActivacion: true,
      },
      orderBy: {
        autorizadoEn: 'desc',
      },
    });

    console.log(`[obtenerDispositivosAutorizados] Total dispositivos encontrados en BD: ${dispositivos.length}`);
    
    // Log de cada dispositivo para debug
    dispositivos.forEach((d, index) => {
      console.log(`[obtenerDispositivosAutorizados] Dispositivo ${index + 1}:`, {
        id: d.id,
        fingerprint: d.fingerprint.substring(0, 16) + '...',
        nombre: d.nombre,
        activo: d.activo,
        codigoActivacionId: d.codigoActivacionId,
        codigo: d.codigoActivacion?.codigo || 'sin código'
      });
    });

    return dispositivos.map(d => {
      const dispositivo = {
        id: d.id,
        fingerprint: d.fingerprint,
        nombre: d.nombre,
        user_agent: d.userAgent,
        ip_address: d.ipAddress,
        autorizado_en: d.autorizadoEn,
        ultimo_acceso: d.ultimoAcceso,
        activo: d.activo,
        codigo_activacion: d.codigoActivacion?.codigo || null,
        codigo_activacion_id: d.codigoActivacionId || null,
        codigo_usado: d.codigoActivacion?.usado || false,
        codigo_expira_en: d.codigoActivacion?.expiraEn || null,
        codigo_activo: d.codigoActivacion?.activo ?? true,
      };
      
      console.log(`[obtenerDispositivosAutorizados] Dispositivo: ${dispositivo.id}, activo: ${dispositivo.activo}, código: ${dispositivo.codigo_activacion || 'sin código'}`);
      
      return dispositivo;
    });
  } catch (error) {
    console.error('Error obteniendo dispositivos autorizados:', error);
    throw error;
  }
}

/**
 * Obtiene todos los códigos de activación
 */
export async function obtenerCodigosActivacion() {
  try {
    const codigos = await prisma.codigoActivacion.findMany({
      orderBy: {
        creadoEn: 'desc',
      },
    });

    return codigos.map(c => ({
      id: c.id,
      codigo: c.codigo,
      nombre: c.nombre,
      usado: c.usado,
      usado_en: c.usadoEn,
      dispositivo_fingerprint: c.dispositivoFingerprint,
      creado_en: c.creadoEn,
      expira_en: c.expiraEn,
      activo: c.activo,
    }));
  } catch (error) {
    console.error('Error obteniendo códigos de activación:', error);
    throw error;
  }
}


import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

/**
 * Obtener token JWT del usuario desde el header Authorization
 */
function getUserIdFromToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, process.env.NEXTAUTH_SECRET || 'fallback-secret') as { userId: string };
    return decoded.userId;
  } catch {
    return null;
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Verificar autenticación y permisos (solo superadmin puede editar)
    const userId = getUserIdFromToken(request);
    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { username: true, role: true }
    });

    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Solo los administradores pueden editar usuarios' }, { status: 403 });
    }

    const { id } = await context.params
    const body = await request.json()
    const { 
      nombres, 
      apellidos, 
      cedula, 
      credencial, 
      telefono, 
      grado, 
      role,
      password,
      isActive
    } = body

    // Verificar si el usuario existe
    const existingUser = await prisma.user.findUnique({
      where: { id }
    })

    if (!existingUser) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    // Si se está cambiando la cédula, verificar que no esté en uso
    if (cedula && cedula !== existingUser.cedula) {
      const cedulaInUse = await prisma.user.findUnique({
        where: { cedula }
      })

      if (cedulaInUse) {
        return NextResponse.json({ error: 'La cédula ya está registrada' }, { status: 409 })
      }
    }

    // Preparar datos de actualización
    const updateData: Record<string, unknown> = {
      nombres,
      apellidos,
      cedula,
      credencial,
      telefono,
      grado,
      role
    }

    // Si se proporcionó una nueva contraseña, hashearla
    if (password) {
      updateData.password = await bcrypt.hash(password, 12)
    }

    // Si se proporcionó isActive, validar y actualizar
    if (typeof isActive === 'boolean') {
      // No permitir deshabilitar al superadmin
      if (existingUser.username === 'garv' && !isActive) {
        return NextResponse.json({ error: 'No se puede deshabilitar al superadmin' }, { status: 400 })
      }
      updateData.isActive = isActive
    }

    // Actualizar el usuario
    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        username: true,
        nombres: true,
        apellidos: true,
        cedula: true,
        credencial: true,
        telefono: true,
        grado: true,
        role: true,
        isActive: true,
        createdAt: true
      }
    })

    return NextResponse.json(updatedUser)
  } catch (error) {
    console.error('Error updating user:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Verificar autenticación y permisos (solo superadmin puede eliminar)
    const userId = getUserIdFromToken(request);
    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { username: true, role: true }
    });

    if (!currentUser || currentUser.username !== 'garv') {
      return NextResponse.json({ error: 'Solo el superadmin puede eliminar usuarios' }, { status: 403 });
    }

    const { id } = await context.params

    // Verificar si el usuario existe
    const user = await prisma.user.findUnique({
      where: { id }
    })

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    // Eliminar el usuario (las visitas se eliminarán en cascada gracias al onDelete: Cascade)
    await prisma.user.delete({
      where: { id }
    })

    return NextResponse.json({ message: 'Usuario eliminado exitosamente' })
  } catch (error) {
    console.error('Error deleting user:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

/**
 * PATCH /api/users/[id]
 * Habilitar o deshabilitar un usuario (solo superadmin)
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Verificar autenticación y permisos (solo superadmin)
    const userId = getUserIdFromToken(request);
    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { username: true, role: true }
    });

    if (!currentUser || currentUser.username !== 'garv') {
      return NextResponse.json({ error: 'Solo el superadmin puede habilitar/deshabilitar usuarios' }, { status: 403 });
    }

    const { id } = await context.params
    const body = await request.json()
    const { isActive } = body

    if (typeof isActive !== 'boolean') {
      return NextResponse.json({ error: 'isActive debe ser un valor booleano' }, { status: 400 })
    }

    // Verificar si el usuario existe
    const user = await prisma.user.findUnique({
      where: { id }
    })

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    // No permitir deshabilitar al superadmin (garv)
    if (user.username === 'garv' && !isActive) {
      return NextResponse.json({ error: 'No se puede deshabilitar al superadmin' }, { status: 400 })
    }

    // Actualizar el estado del usuario
    const updatedUser = await prisma.user.update({
      where: { id },
      data: { isActive },
      select: {
        id: true,
        username: true,
        nombres: true,
        apellidos: true,
        cedula: true,
        credencial: true,
        telefono: true,
        grado: true,
        role: true,
        isActive: true,
        createdAt: true
      }
    })

    return NextResponse.json({
      user: updatedUser,
      message: isActive ? 'Usuario habilitado exitosamente' : 'Usuario deshabilitado exitosamente'
    })
  } catch (error) {
    console.error('Error updating user status:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}


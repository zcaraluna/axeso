import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
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
      password 
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


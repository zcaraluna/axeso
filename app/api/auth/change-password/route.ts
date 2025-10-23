import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, newPassword } = body

    if (!userId || !newPassword) {
      return NextResponse.json({ error: 'Todos los campos son requeridos' }, { status: 400 })
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: 'La contraseña debe tener al menos 6 caracteres' }, { status: 400 })
    }

    // Buscar el usuario
    const user = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    // Verificar que la nueva contraseña sea diferente a la actual
    const isSamePassword = await bcrypt.compare(newPassword, user.password)

    if (isSamePassword) {
      return NextResponse.json({ error: 'La nueva contraseña debe ser diferente a la actual' }, { status: 400 })
    }

    // Hashear la nueva contraseña
    const hashedPassword = await bcrypt.hash(newPassword, 12)

    // Actualizar la contraseña y marcar como no necesita cambio
    await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        mustChangePassword: false
      }
    })

    return NextResponse.json({ message: 'Contraseña actualizada exitosamente' })
  } catch (error) {
    console.error('Error changing password:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}


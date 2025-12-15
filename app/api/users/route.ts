import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function GET() {
  try {
    const users = await prisma.user.findMany({
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
        createdAt: true,
        _count: {
          select: { visits: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(users)
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      username, 
      password, 
      nombres, 
      apellidos, 
      cedula, 
      credencial, 
      telefono, 
      grado, 
      role 
    } = body

    if (!username || !password || !nombres || !apellidos || !cedula || !credencial || !telefono || !grado) {
      return NextResponse.json({ error: 'Todos los campos son requeridos' }, { status: 400 })
    }

    // Verificar si el username ya existe
    const existingUser = await prisma.user.findUnique({
      where: { username }
    })

    if (existingUser) {
      return NextResponse.json({ error: 'El nombre de usuario ya existe' }, { status: 409 })
    }

    // Verificar si la cédula ya existe
    const existingCedula = await prisma.user.findUnique({
      where: { cedula }
    })

    if (existingCedula) {
      return NextResponse.json({ error: 'La cédula ya está registrada' }, { status: 409 })
    }

    const hashedPassword = await bcrypt.hash(password, 12)

    const user = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        nombres,
        apellidos,
        cedula,
        credencial,
        telefono,
        grado,
        role: role || 'user',
        mustChangePassword: true
      },
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

    return NextResponse.json(user)
  } catch (error) {
    console.error('Error creating user:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

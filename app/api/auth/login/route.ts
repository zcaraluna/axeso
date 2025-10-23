import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { username, password } = body

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password required' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { username }
    })

    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    const isValidPassword = await bcrypt.compare(password, user.password)

    if (!isValidPassword) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    const token = jwt.sign(
      { userId: user.id, username: user.username },
      process.env.NEXTAUTH_SECRET || 'fallback-secret',
      { expiresIn: '2h' }
    )

    return NextResponse.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        nombres: user.nombres,
        apellidos: user.apellidos,
        role: user.role,
        mustChangePassword: user.mustChangePassword
      }
    })
  } catch (error) {
    console.error('Error during login:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

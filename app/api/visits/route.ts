import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')

    let whereClause: Record<string, unknown> = {}

    if (search) {
      whereClause = {
        OR: [
          { nombres: { contains: search, mode: 'insensitive' } },
          { apellidos: { contains: search, mode: 'insensitive' } },
          { cedula: { contains: search, mode: 'insensitive' } },
          { motivoCategoria: { contains: search, mode: 'insensitive' } }
        ]
      }
    }

    const visits = await prisma.visit.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(visits)
  } catch (error) {
    console.error('Error fetching visits:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const MAX_RETRIES = 10
  
  try {
    const body = await request.json()
    const {
      nombres,
      apellidos,
      cedula,
      fechaNacimiento,
      edad,
      telefono,
      entryDate,
      entryTime,
      motivoCategoria,
      motivoDescripcion,
      photo,
      userId
    } = body

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }

    // Obtener información del usuario que registra
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { nombres: true, apellidos: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const registeredBy = `${user.nombres} ${user.apellidos}`.trim()

    // Obtener fecha de hoy
    const now = new Date()
    const day = String(now.getDate()).padStart(2, '0')
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const year = String(now.getFullYear()).slice(-2) // Últimos 2 dígitos del año
    const prefix = `ASU${day}${month}${year}-`

    // Intentar crear la visita con reintentos en caso de conflicto de ID
    let visit = null
    let lastError = null

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        // Buscar el siguiente número disponible verificando IDs existentes
        const existingIds = await prisma.visit.findMany({
          where: {
            id: {
              startsWith: prefix
            }
          },
          select: {
            id: true
          },
          orderBy: {
            id: 'desc'
          }
        })

        // Extraer los números de los IDs existentes
        const existingNumbers = existingIds
          .map(v => {
            const match = v.id.match(/-(\d+)$/)
            return match ? parseInt(match[1]) : 0
          })
          .filter(n => !isNaN(n) && n > 0)
          .sort((a, b) => b - a)

        // Encontrar el siguiente número disponible
        let nextNumber = 1
        if (existingNumbers.length > 0) {
          nextNumber = existingNumbers[0] + 1
        }

        const customId = `${prefix}${String(nextNumber).padStart(3, '0')}`

        // Intentar crear la visita
        visit = await prisma.visit.create({
          data: {
            id: customId,
            nombres,
            apellidos,
            cedula,
            fechaNacimiento: new Date(fechaNacimiento),
            edad,
            telefono,
            entryDate,
            entryTime,
            motivoCategoria,
            motivoDescripcion,
            photo,
            registeredBy,
            userId
          }
        })

        // Si se creó exitosamente, salir del loop
        break
      } catch (error: unknown) {
        lastError = error
        // Si es un error de constraint único, reintentar
        if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
          console.log(`Intento ${attempt + 1} falló por ID duplicado, reintentando...`)
          continue
        }
        // Si es otro tipo de error, lanzarlo
        throw error
      }
    }

    // Si después de todos los reintentos no se pudo crear
    if (!visit) {
      console.error('No se pudo crear la visita después de múltiples intentos:', lastError)
      return NextResponse.json({ error: 'No se pudo generar un ID único para la visita' }, { status: 500 })
    }

    return NextResponse.json(visit)
  } catch (error) {
    console.error('Error creating visit:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

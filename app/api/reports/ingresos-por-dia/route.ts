import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'fallback-secret'

function parseEntryDate(entryDateStr: string): Date | null {
    // entryDate format: DD/MM/YYYY
    const parts = entryDateStr.split('/')
    if (parts.length !== 3) return null
    const [day, month, year] = parts
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
}

export async function GET(request: NextRequest) {
    try {
        // Authenticate and authorize: only 'garv' can access this
        const authHeader = request.headers.get('Authorization')
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        }

        const token = authHeader.split(' ')[1]
        let decoded: { userId?: string; username?: string; role?: string }

        try {
            decoded = jwt.verify(token, JWT_SECRET) as { userId?: string; username?: string; role?: string }
        } catch {
            return NextResponse.json({ error: 'Token inválido' }, { status: 401 })
        }

        if (decoded.username !== 'garv') {
            return NextResponse.json({ error: 'Acceso no permitido' }, { status: 403 })
        }

        // Parse date range (YYYY-MM-DD format from HTML date input)
        const { searchParams } = new URL(request.url)
        const startDateParam = searchParams.get('startDate')
        const endDateParam = searchParams.get('endDate')

        if (!startDateParam) {
            return NextResponse.json({ error: 'Se requiere al menos una fecha de inicio' }, { status: 400 })
        }

        // Build date range
        const startDate = new Date(startDateParam + 'T00:00:00')
        const endDate = endDateParam ? new Date(endDateParam + 'T23:59:59') : new Date(startDateParam + 'T23:59:59')

        // Extend range slightly to account for timezone differences (Paraguay is UTC-3 or UTC-4)
        const startWithBuffer = new Date(startDate)
        startWithBuffer.setDate(startWithBuffer.getDate() - 1)
        const endWithBuffer = new Date(endDate)
        endWithBuffer.setDate(endWithBuffer.getDate() + 1)

        // Fetch all visits in the approximate range using createdAt for efficiency
        const allVisits = await prisma.visit.findMany({
            where: {
                createdAt: {
                    gte: startWithBuffer,
                    lte: endWithBuffer,
                }
            },
            orderBy: { createdAt: 'asc' }
        })

        // Filter in memory by the actual entryDate string (DD/MM/YYYY)
        const filteredVisits = allVisits.filter(visit => {
            const visitDate = parseEntryDate(visit.entryDate)
            if (!visitDate) return false
            return visitDate >= startDate && visitDate <= endDate
        })

        return NextResponse.json({ visits: filteredVisits, total: filteredVisits.length })
    } catch (error) {
        console.error('Error en reporte de ingresos por día:', error)
        return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
    }
}

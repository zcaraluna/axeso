import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// ENDPOINT TEMPORAL DE DIAGNÓSTICO
// ELIMINAR DESPUÉS DE RESOLVER EL PROBLEMA
export async function GET(request: Request) {
    try {
        // Verificar autenticación básica con query param secreto
        const { searchParams } = new URL(request.url)
        const secret = searchParams.get('secret')

        // Usar un secreto simple para acceso temporal
        if (secret !== 'debug2026') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Información de diagnóstico
        const diagnostics = {
            timestamp: new Date().toISOString(),
            environment: {
                nodeEnv: process.env.NODE_ENV,
                hasDatabaseUrl: !!process.env.DATABASE_URL,
                databaseUrlPrefix: process.env.DATABASE_URL?.substring(0, 40) + '...',
                hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
                hasSiteUrl: !!process.env.NEXT_PUBLIC_SITE_URL,
            },
            database: {
                status: 'checking...',
                hasIsActiveField: false,
                userCount: 0,
                visitCount: 0,
                recentVisit: null as any,
            }
        }

        // Intentar consultar la base de datos
        try {
            // Verificar si la tabla users tiene el campo isActive
            const userSample = await prisma.user.findFirst({
                select: {
                    id: true,
                    username: true,
                    isActive: true, // Esto fallará si el campo no existe
                    createdAt: true,
                }
            })

            diagnostics.database.status = 'connected'
            diagnostics.database.hasIsActiveField = true

            // Contar registros
            const userCount = await prisma.user.count()
            const visitCount = await prisma.visit.count()

            // Obtener última visita
            const recentVisit = await prisma.visit.findFirst({
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    nombres: true,
                    apellidos: true,
                    createdAt: true,
                }
            })

            diagnostics.database.userCount = userCount
            diagnostics.database.visitCount = visitCount
            diagnostics.database.recentVisit = recentVisit

        } catch (dbError: any) {
            diagnostics.database.status = 'error'
            diagnostics.database.hasIsActiveField = dbError.message?.includes('isActive') ? false : true
        }

        return NextResponse.json(diagnostics, { status: 200 })

    } catch (error: any) {
        return NextResponse.json({
            error: 'Diagnostic failed',
            message: error.message
        }, { status: 500 })
    }
}

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getParaguayDate } from '@/lib/date-utils'

export async function GET(request: NextRequest) {
    try {
        // Obtener fecha de hoy en formato DD/MM/YYYY (Paraguay)
        const todayStr = getParaguayDate();

        // 1. Visitas de hoy (total)
        const totalToday = await prisma.visit.count({
            where: {
                entryDate: todayStr
            }
        });

        // 2. Personas dentro (sin exitTime, sin importar la fecha)
        const insideNow = await prisma.visit.count({
            where: {
                exitTime: null
            }
        });

        // 3. Salidas de hoy
        const exitedToday = await prisma.visit.count({
            where: {
                AND: [
                    { exitDate: todayStr },
                    { exitTime: { not: null } }
                ]
            }
        });

        return NextResponse.json({
            total: totalToday,
            inside: insideNow,
            exited: exitedToday
        });

    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

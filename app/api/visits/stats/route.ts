import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
    try {
        // Obtener fecha de hoy en formato DD/MM/YYYY
        const today = new Date();
        const todayStr = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;

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

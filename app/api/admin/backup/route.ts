import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';

const execPromise = promisify(exec);

/**
 * Obtener el nombre de usuario desde el token JWT
 */
async function getUsernameFromToken(request: NextRequest): Promise<string | null> {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }

    const token = authHeader.substring(7);
    try {
        const decoded = jwt.verify(token, process.env.NEXTAUTH_SECRET || 'fallback-secret') as { userId: string };

        const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
            select: { username: true }
        });

        return user?.username || null;
    } catch {
        return null;
    }
}

export async function GET(request: NextRequest) {
    try {
        // 1. Verificar que el usuario sea "garv"
        const username = await getUsernameFromToken(request);

        if (username !== 'garv') {
            return NextResponse.json(
                { error: 'No tienes permisos para realizar esta acción. Solo el usuario "garv" puede realizar copias de seguridad.' },
                { status: 403 }
            );
        }

        // 2. Obtener la URL de la base de datos para pg_dump
        const databaseUrl = process.env.DATABASE_URL;
        if (!databaseUrl) {
            throw new Error('DATABASE_URL no está definida');
        }

        // 3. Definir nombre de archivo temporal
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fileName = `axeso_backup_${timestamp}.sql`;
        const tempPath = path.join(process.cwd(), 'tmp', fileName);

        // Asegurarse de que el directorio tmp existe
        if (!fs.existsSync(path.join(process.cwd(), 'tmp'))) {
            fs.mkdirSync(path.join(process.cwd(), 'tmp'), { recursive: true });
        }

        // 4. Ejecutar pg_dump
        // Usamos la URL directamente para evitar lidiar con múltiples variables
        // pg_dump puede tomar la URL con el flag --dbname
        await execPromise(`pg_dump "${databaseUrl}" -f "${tempPath}"`);

        // 5. Leer el archivo y devolverlo como descarga
        const fileBuffer = fs.readFileSync(tempPath);

        // 6. Eliminar el archivo temporal
        fs.unlinkSync(tempPath);

        // 7. Devolver respuesta con el archivo
        return new NextResponse(fileBuffer, {
            status: 200,
            headers: {
                'Content-Type': 'application/sql',
                'Content-Disposition': `attachment; filename="${fileName}"`,
            },
        });

    } catch (error) {
        console.error('Error durante el backup:', error);
        return NextResponse.json(
            { error: 'Error interno al generar la copia de seguridad' },
            { status: 500 }
        );
    }
}

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

export const dynamic = 'force-dynamic';

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

/**
 * Escapa valores para SQL
 */
function escapeSqlValue(value: any): string {
    if (value === null || value === undefined) return 'NULL';
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    if (typeof value === 'number') return value.toString();
    if (value instanceof Date) return `'${value.toISOString()}'`;

    // Escape single quotes for strings
    const escaped = String(value).replace(/'/g, "''");
    return `'${escaped}'`;
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

        let sqlDump = `-- Backup generated on ${new Date().toISOString()}\n`;
        sqlDump += `SET statement_timeout = 0;\nSET lock_timeout = 0;\nSET idle_in_transaction_session_timeout = 0;\nSET client_encoding = 'UTF8';\nSET standard_conforming_strings = on;\nSELECT pg_catalog.set_config('search_path', '', false);\nSET check_function_bodies = false;\nSET xmloption = content;\nSET client_min_messages = warning;\nSET row_security = off;\n\n`;

        // 2. Exportar Usuarios
        const users = await prisma.user.findMany();
        if (users.length > 0) {
            sqlDump += `-- Data for table "users"\n`;
            sqlDump += `INSERT INTO "users" ("id", "username", "password", "apellidos", "cedula", "credencial", "grado", "nombres", "role", "telefono", "mustChangePassword", "isActive", "createdAt", "updatedAt") VALUES\n`;
            sqlDump += users.map(u => `(${escapeSqlValue(u.id)}, ${escapeSqlValue(u.username)}, ${escapeSqlValue(u.password)}, ${escapeSqlValue(u.apellidos)}, ${escapeSqlValue(u.cedula)}, ${escapeSqlValue(u.credencial)}, ${escapeSqlValue(u.grado)}, ${escapeSqlValue(u.nombres)}, ${escapeSqlValue(u.role)}, ${escapeSqlValue(u.telefono)}, ${escapeSqlValue(u.mustChangePassword)}, ${escapeSqlValue(u.isActive)}, ${escapeSqlValue(u.createdAt)}, ${escapeSqlValue(u.updatedAt)})`).join(',\n') + ';\n\n';
        }

        // 3. Exportar Códigos de Activación
        const codigos = await prisma.codigoActivacion.findMany();
        if (codigos.length > 0) {
            sqlDump += `-- Data for table "codigos_activacion"\n`;
            sqlDump += `INSERT INTO "codigos_activacion" ("id", "codigo", "usado", "usadoEn", "dispositivoFingerprint", "creadoEn", "creadoPor", "expiraEn", "nombre", "activo") VALUES\n`;
            sqlDump += codigos.map(c => `(${escapeSqlValue(c.id)}, ${escapeSqlValue(c.codigo)}, ${escapeSqlValue(c.usado)}, ${escapeSqlValue(c.usadoEn)}, ${escapeSqlValue(c.dispositivoFingerprint)}, ${escapeSqlValue(c.creadoEn)}, ${escapeSqlValue(c.creadoPor)}, ${escapeSqlValue(c.expiraEn)}, ${escapeSqlValue(c.nombre)}, ${escapeSqlValue(c.activo)})`).join(',\n') + ';\n\n';
        }

        // 4. Exportar Dispositivos Autorizados
        const dispositivos = await prisma.dispositivoAutorizado.findMany();
        if (dispositivos.length > 0) {
            sqlDump += `-- Data for table "dispositivos_autorizados"\n`;
            sqlDump += `INSERT INTO "dispositivos_autorizados" ("id", "fingerprint", "userAgent", "ipAddress", "codigoActivacionId", "autorizadoEn", "ultimoAcceso", "activo", "nombre") VALUES\n`;
            sqlDump += dispositivos.map(d => `(${escapeSqlValue(d.id)}, ${escapeSqlValue(d.fingerprint)}, ${escapeSqlValue(d.userAgent)}, ${escapeSqlValue(d.ipAddress)}, ${escapeSqlValue(d.codigoActivacionId)}, ${escapeSqlValue(d.autorizadoEn)}, ${escapeSqlValue(d.ultimoAcceso)}, ${escapeSqlValue(d.activo)}, ${escapeSqlValue(d.nombre)})`).join(',\n') + ';\n\n';
        }

        // 5. Exportar Visitas
        const visits = await prisma.visit.findMany();
        if (visits.length > 0) {
            sqlDump += `-- Data for table "visits"\n`;
            sqlDump += `INSERT INTO "visits" ("id", "nombres", "apellidos", "cedula", "telefono", "entryDate", "entryTime", "motivoCategoria", "motivoDescripcion", "photo", "exitDate", "exitTime", "registeredBy", "createdAt", "updatedAt", "userId", "exitRegisteredBy", "tipoDocumento") VALUES\n`;
            sqlDump += visits.map(v => `(${escapeSqlValue(v.id)}, ${escapeSqlValue(v.nombres)}, ${escapeSqlValue(v.apellidos)}, ${escapeSqlValue(v.cedula)}, ${escapeSqlValue(v.telefono)}, ${escapeSqlValue(v.entryDate)}, ${escapeSqlValue(v.entryTime)}, ${escapeSqlValue(v.motivoCategoria)}, ${escapeSqlValue(v.motivoDescripcion)}, ${escapeSqlValue(v.photo)}, ${escapeSqlValue(v.exitDate)}, ${escapeSqlValue(v.exitTime)}, ${escapeSqlValue(v.registeredBy)}, ${escapeSqlValue(v.createdAt)}, ${escapeSqlValue(v.updatedAt)}, ${escapeSqlValue(v.userId)}, ${escapeSqlValue(v.exitRegisteredBy)}, ${escapeSqlValue(v.tipoDocumento)})`).join(',\n') + ';\n\n';
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fileName = `axeso_backup_prisma_${timestamp}.sql`;

        // 7. Devolver respuesta con el archivo
        return new NextResponse(sqlDump, {
            status: 200,
            headers: {
                'Content-Type': 'application/sql',
                'Content-Disposition': `attachment; filename="${fileName}"`,
            },
        });

    } catch (error) {
        console.error('Error durante el backup:', error);
        return NextResponse.json(
            { error: 'Error interno al generar la copia de seguridad native' },
            { status: 500 }
        );
    }
}

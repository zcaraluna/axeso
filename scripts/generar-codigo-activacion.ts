import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Cargar variables de entorno
const envPath = path.join(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  dotenv.config();
}

const prisma = new PrismaClient();

async function generarCodigoActivacion(diasExpiracion: number = 30, nombre: string | null = null) {
  try {
    if (!process.env.DATABASE_URL) {
      console.error('❌ Error: DATABASE_URL no está configurado en .env.local');
      process.exit(1);
    }

    console.log('✅ Conectando a la base de datos...');

    // Verificar conexión
    await prisma.$connect();

    const codigo = crypto.randomBytes(16).toString('hex').toUpperCase();
    const codigoFormateado = codigo.match(/.{1,4}/g)?.join('-') || codigo;

    const fechaExpiracion = new Date();
    fechaExpiracion.setDate(fechaExpiracion.getDate() + diasExpiracion);

    await prisma.codigoActivacion.create({
      data: {
        codigo,
        expiraEn: fechaExpiracion,
        nombre: nombre || null,
      },
    });

    console.log('\n✅ ¡Código de activación generado exitosamente!');
    console.log('\n📋 Detalles del código:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    if (nombre) {
      console.log(`Nombre:        ${nombre}`);
    }
    console.log(`Código:        ${codigoFormateado}`);
    console.log(`                ${codigo} (sin guiones también válido)`);
    console.log(`Expira en:     ${fechaExpiracion.toLocaleDateString('es-PY')}`);
    console.log(`Días válido:   ${diasExpiracion}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n⚠️  IMPORTANTE:');
    console.log('   • Este código solo puede ser usado UNA VEZ');
    console.log('   • Guárdalo de forma segura');
    console.log('   • Compártelo solo con quien necesita autorizar un dispositivo');
    console.log('   • El usuario debe ingresarlo en: /autenticar');
    console.log('   • Puede ingresarse con o sin guiones\n');

    await prisma.$disconnect();
    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ Error generando código de activación:', error.message);
    if (error.code) {
      console.error('Código de error:', error.code);
    }
    if (error.meta) {
      console.error('Detalle:', error.meta);
    }
    await prisma.$disconnect();
    process.exit(1);
  }
}

const diasExpiracion = process.argv[2] ? parseInt(process.argv[2]) : 30;
const nombre = process.argv[3] || null;

if (isNaN(diasExpiracion) || diasExpiracion < 1) {
  console.error('❌ Error: Los días de expiración deben ser un número positivo');
  console.error('Uso: npx tsx scripts/generar-codigo-activacion.ts [dias_expiracion] [nombre]');
  console.error('Ejemplo: npx tsx scripts/generar-codigo-activacion.ts 30 "Oficina Central"');
  process.exit(1);
}

generarCodigoActivacion(diasExpiracion, nombre);


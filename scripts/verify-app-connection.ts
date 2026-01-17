// Script para verificar que la aplicación está conectada a NeonDB
// Ejecutar: npx tsx scripts/verify-app-connection.ts

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyConnection() {
  try {
    console.log('🔍 Verificando conexión a la base de datos...\n');
    
    // 1. Verificar que la URL de conexión contiene "neon"
    const dbUrl = process.env.DATABASE_URL || '';
    if (dbUrl.includes('neon')) {
      console.log('✅ DATABASE_URL apunta a NeonDB');
      console.log(`   Host: ${dbUrl.match(/@([^/]+)/)?.[1] || 'No encontrado'}\n`);
    } else if (dbUrl.includes('localhost')) {
      console.log('⚠️  ADVERTENCIA: DATABASE_URL apunta a localhost (VPS)');
      console.log('   Debes actualizar la variable de entorno en Vercel\n');
    } else {
      console.log('⚠️  DATABASE_URL no reconocida');
      console.log(`   URL: ${dbUrl.substring(0, 50)}...\n`);
    }

    // 2. Probar conexión
    console.log('🔌 Probando conexión...');
    await prisma.$connect();
    console.log('✅ Conexión exitosa\n');

    // 3. Verificar datos
    console.log('📊 Verificando datos...');
    const userCount = await prisma.user.count();
    const visitCount = await prisma.visit.count();
    
    console.log(`   Usuarios: ${userCount}`);
    console.log(`   Visitas: ${visitCount}\n`);

    // 4. Verificar registro específico (JESUS ANDRES SANCHEZ CACERES)
    const jesusVisit = await prisma.visit.findFirst({
      where: {
        nombres: { contains: 'JESUS' },
        apellidos: { contains: 'SANCHEZ' }
      }
    });

    if (jesusVisit) {
      console.log('✅ Registro de JESUS ANDRES SANCHEZ CACERES encontrado');
      console.log(`   ID: ${jesusVisit.id}`);
      console.log(`   Fecha entrada: ${jesusVisit.entryDate} ${jesusVisit.entryTime}`);
      if (jesusVisit.exitDate) {
        console.log(`   Fecha salida: ${jesusVisit.exitDate} ${jesusVisit.exitTime}`);
      }
    } else {
      console.log('⚠️  Registro de JESUS ANDRES SANCHEZ CACERES NO encontrado');
    }

    console.log('\n✅ Verificación completada');
    
  } catch (error) {
    console.error('❌ Error al verificar conexión:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

verifyConnection();


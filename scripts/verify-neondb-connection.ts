/**
 * Script para verificar la conexión a NeonDB y validar que todo funcione correctamente
 * Uso: DATABASE_URL="<tu-neondb-connection-string>" npx tsx scripts/verify-neondb-connection.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyConnection() {
  console.log('🔍 Verificando conexión a NeonDB...\n');

  try {
    // 1. Verificar conexión básica
    console.log('1️⃣ Verificando conexión básica...');
    await prisma.$connect();
    console.log('   ✅ Conexión establecida\n');

    // 2. Verificar tablas
    console.log('2️⃣ Verificando estructura de tablas...');
    
    const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY tablename;
    `;

    const expectedTables = ['users', 'visits', 'codigos_activacion', 'dispositivos_autorizados'];
    const foundTables = tables.map(t => t.tablename);

    console.log(`   Tablas encontradas: ${foundTables.join(', ')}`);
    
    const missingTables = expectedTables.filter(t => !foundTables.includes(t));
    if (missingTables.length > 0) {
      console.log(`   ⚠️  Tablas faltantes: ${missingTables.join(', ')}\n`);
    } else {
      console.log('   ✅ Todas las tablas esperadas están presentes\n');
    }

    // 3. Verificar conteo de registros
    console.log('3️⃣ Verificando conteo de registros...');
    
    try {
      const userCount = await prisma.user.count();
      console.log(`   📊 Usuarios: ${userCount}`);
    } catch (e) {
      console.log(`   ❌ Error al contar usuarios: ${e}`);
    }

    try {
      const visitCount = await prisma.visit.count();
      console.log(`   📊 Visitas: ${visitCount}`);
    } catch (e) {
      console.log(`   ❌ Error al contar visitas: ${e}`);
    }

    try {
      const codigoCount = await prisma.codigoActivacion.count();
      console.log(`   📊 Códigos de activación: ${codigoCount}`);
    } catch (e) {
      console.log(`   ❌ Error al contar códigos: ${e}`);
    }

    try {
      const dispositivoCount = await prisma.dispositivoAutorizado.count();
      console.log(`   📊 Dispositivos autorizados: ${dispositivoCount}`);
    } catch (e) {
      console.log(`   ❌ Error al contar dispositivos: ${e}`);
    }

    console.log('');

    // 4. Verificar índices
    console.log('4️⃣ Verificando índices importantes...');
    
    const indexes = await prisma.$queryRaw<Array<{ indexname: string }>>`
      SELECT indexname 
      FROM pg_indexes 
      WHERE schemaname = 'public'
      ORDER BY indexname;
    `;

    const importantIndexes = indexes.filter(idx => 
      idx.indexname.includes('username') || 
      idx.indexname.includes('cedula') || 
      idx.indexname.includes('codigo') ||
      idx.indexname.includes('fingerprint')
    );

    if (importantIndexes.length > 0) {
      console.log(`   ✅ Índices encontrados: ${importantIndexes.map(i => i.indexname).join(', ')}\n`);
    } else {
      console.log('   ⚠️  No se encontraron índices esperados\n');
    }

    // 5. Probar una consulta simple
    console.log('5️⃣ Probando consulta de ejemplo...');
    
    try {
      const firstUser = await prisma.user.findFirst();
      if (firstUser) {
        console.log(`   ✅ Consulta exitosa - Usuario encontrado: ${firstUser.username}\n`);
      } else {
        console.log('   ⚠️  No hay usuarios en la base de datos\n');
      }
    } catch (e) {
      console.log(`   ❌ Error en consulta: ${e}\n`);
    }

    // 6. Verificar SSL
    console.log('6️⃣ Verificando configuración SSL...');
    
    try {
      const sslStatus = await prisma.$queryRaw<Array<{ ssl_is_used: boolean }>>`
        SELECT ssl_is_used() as ssl_is_used;
      `;
      
      if (sslStatus[0]?.ssl_is_used) {
        console.log('   ✅ Conexión SSL activa\n');
      } else {
        console.log('   ⚠️  Conexión SSL no detectada (puede ser normal en algunos casos)\n');
      }
    } catch (e) {
      console.log('   ⚠️  No se pudo verificar SSL\n');
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Verificación completada exitosamente');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  } catch (error) {
    console.error('\n❌ Error durante la verificación:');
    console.error(error);
    
    if (error instanceof Error) {
      if (error.message.includes('P1001')) {
        console.error('\n💡 Sugerencia: Verifica que la DATABASE_URL sea correcta');
        console.error('   y que NeonDB permita conexiones desde tu IP.');
      } else if (error.message.includes('SSL')) {
        console.error('\n💡 Sugerencia: Asegúrate de que la connection string incluya ?sslmode=require');
      }
    }
    
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar verificación
verifyConnection().catch((error) => {
  console.error('Error fatal:', error);
  process.exit(1);
});


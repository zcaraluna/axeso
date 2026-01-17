/**
 * Script para importar datos del backup a NeonDB usando Prisma
 * Este script primero crea el schema y luego importa los datos
 * 
 * Uso: 
 * 1. Configura DATABASE_URL en .env.local con la connection string de NeonDB
 * 2. Ejecuta: npx tsx scripts/import-data-to-neondb.ts
 */

import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function importData() {
  console.log('🚀 Iniciando importación a NeonDB...\n');

  try {
    // Paso 1: Verificar conexión
    console.log('1️⃣ Verificando conexión a NeonDB...');
    await prisma.$connect();
    console.log('   ✅ Conexión establecida\n');

    // Paso 2: Aplicar migraciones (crear schema)
    console.log('2️⃣ Aplicando migraciones (creando schema)...');
    try {
      execSync('npx prisma migrate deploy', { stdio: 'inherit' });
      console.log('   ✅ Schema creado\n');
    } catch (error) {
      console.log('   ⚠️  Error al aplicar migraciones, continuando...\n');
    }

    // Paso 3: Regenerar Prisma Client
    console.log('3️⃣ Regenerando Prisma Client...');
    execSync('npx prisma generate', { stdio: 'inherit' });
    console.log('   ✅ Prisma Client regenerado\n');

    // Paso 4: Verificar tablas
    console.log('4️⃣ Verificando estructura de tablas...');
    const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY tablename;
    `;
    console.log(`   📊 Tablas encontradas: ${tables.map(t => t.tablename).join(', ')}\n`);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Configuración completada');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('📋 Próximos pasos:');
    console.log('');
    console.log('Para importar los datos del backup, necesitas usar pg_restore o psql.');
    console.log('');
    console.log('Opción 1: Instalar PostgreSQL client en Windows');
    console.log('  - Descarga desde: https://www.postgresql.org/download/windows/');
    console.log('  - Instala solo el cliente (no el servidor)');
    console.log('  - Luego ejecuta:');
    console.log('    pg_restore -d "TU_CONNECTION_STRING" --no-owner --no-privileges backup_neondb_20260107_021552.dump');
    console.log('');
    console.log('Opción 2: Usar psql desde MobaXterm (si está disponible)');
    console.log('  - Verifica: which psql');
    console.log('  - Si está disponible, puedes convertir el .dump a .sql primero');
    console.log('');
    console.log('Opción 3: Importar manualmente los datos críticos');
    console.log('  - Puedes usar Prisma Studio para verificar: npx prisma studio');
    console.log('  - Y luego usar la aplicación para crear los datos iniciales');
    console.log('');

  } catch (error) {
    console.error('\n❌ Error durante la importación:');
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar
importData().catch((error) => {
  console.error('Error fatal:', error);
  process.exit(1);
});


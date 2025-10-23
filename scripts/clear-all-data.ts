import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🗑️  Vaciamos completamente la base de datos...\n');

  // Contar registros antes de eliminar
  const totalVisits = await prisma.visit.count();
  const totalUsers = await prisma.user.count();

  console.log(`📊 Registros actuales:`);
  console.log(`   👥 Usuarios: ${totalUsers}`);
  console.log(`   🚪 Visitas: ${totalVisits}\n`);

  if (totalVisits === 0 && totalUsers === 0) {
    console.log('✅ La base de datos ya está vacía');
    return;
  }

  try {
    // Eliminar todas las visitas
    if (totalVisits > 0) {
      console.log('🗑️  Eliminando todas las visitas...');
      await prisma.visit.deleteMany();
      console.log(`   ✅ ${totalVisits} visitas eliminadas`);
    }

    // Eliminar todos los usuarios
    if (totalUsers > 0) {
      console.log('🗑️  Eliminando todos los usuarios...');
      await prisma.user.deleteMany();
      console.log(`   ✅ ${totalUsers} usuarios eliminados`);
    }

    console.log(`\n🎉 Base de datos vaciada completamente!`);
    console.log(`📊 Estado final:`);
    console.log(`   👥 Usuarios: 0`);
    console.log(`   🚪 Visitas: 0`);

  } catch (error) {
    console.error('❌ Error vaciando la base de datos:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

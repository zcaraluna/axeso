import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // Crear usuarios por defecto
  const hashedAdminPassword = await bcrypt.hash('admin123', 12)
  const hashedOficialPassword = await bcrypt.hash('oficial123', 12)

  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      password: hashedAdminPassword,
      nombres: 'ADMINISTRADOR',
      apellidos: 'DEL SISTEMA',
      cedula: '1234567',
      credencial: 'ADMIN-001',
      telefono: '0981000000',
      grado: 'COMISARIO GENERAL',
      role: 'admin',
      mustChangePassword: false,
    },
  })

  const oficial = await prisma.user.upsert({
    where: { username: 'oficial' },
    update: {},
    create: {
      username: 'oficial',
      password: hashedOficialPassword,
      nombres: 'OFICIAL',
      apellidos: 'DE PRUEBA',
      cedula: '7654321',
      credencial: 'OFIC-001',
      telefono: '0981111111',
      grado: 'OFICIAL PRIMERO',
      role: 'user',
      mustChangePassword: false,
    },
  })

  console.log('Users created:', { admin: admin.username, oficial: oficial.username })
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

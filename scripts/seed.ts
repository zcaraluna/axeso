import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // Crear solo el usuario garv
  const hashedGarvPassword = await bcrypt.hash('admin123', 12)

  const garv = await prisma.user.upsert({
    where: { username: 'garv' },
    update: {
      password: hashedGarvPassword,
      role: 'admin',
      mustChangePassword: false,
      isActive: true, // Siempre activo
    },
    create: {
      username: 'garv',
      password: hashedGarvPassword,
      nombres: 'GARV',
      apellidos: 'ADMINISTRADOR',
      cedula: '9999999',
      credencial: 'GARV-001',
      telefono: '0980000000',
      grado: 'ADMINISTRADOR',
      role: 'admin',
      mustChangePassword: false,
      isActive: true, // Siempre activo
    },
  })

  console.log('User created:', { garv: garv.username })
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

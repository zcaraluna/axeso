import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Función para generar tiempo de salida entre 1-2 horas después de entrada
function generateExitTime(entryTime: string): string {
  const [entryHour, entryMinute] = entryTime.split(':').map(Number)
  const entryTimeInMinutes = entryHour * 60 + entryMinute
  
  // Generar tiempo de estadía entre 60-120 minutos (1-2 horas)
  const stayTimeMinutes = Math.floor(Math.random() * 61) + 60 // 60-120 minutos
  
  const exitTimeInMinutes = entryTimeInMinutes + stayTimeMinutes
  const exitHour = Math.floor(exitTimeInMinutes / 60)
  const exitMinute = exitTimeInMinutes % 60
  
  return `${exitHour.toString().padStart(2, '0')}:${exitMinute.toString().padStart(2, '0')}`
}

// Función para calcular fecha de salida (puede ser el mismo día o el siguiente)
function calculateExitDate(entryDate: string, entryTime: string, exitTime: string): string {
  const [entryHour] = entryTime.split(':').map(Number)
  const [exitHour] = exitTime.split(':').map(Number)
  
  // Si la hora de salida es menor que la de entrada, significa que pasó al día siguiente
  if (exitHour < entryHour) {
    const [day, month, year] = entryDate.split('/')
    const entryDateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
    entryDateObj.setDate(entryDateObj.getDate() + 1)
    return entryDateObj.toLocaleDateString('es-PY', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    })
  }
  
  return entryDate // Mismo día
}

async function main() {
  // Verificar que no estamos en producción
  if (process.env.NODE_ENV === 'production') {
    console.error('❌ ERROR: Este script NO debe ejecutarse en producción!')
    console.error('Este script está diseñado solo para desarrollo y pruebas.')
    process.exit(1)
  }

  // Verificar variable de entorno de seguridad
  if (process.env.ALLOW_DATA_POPULATION !== 'true') {
    console.error('❌ ERROR: Variable ALLOW_DATA_POPULATION no está configurada.')
    console.error('Para ejecutar este script, configura: ALLOW_DATA_POPULATION=true')
    console.error('Ejemplo: ALLOW_DATA_POPULATION=true npx tsx scripts/update-exits.ts')
    process.exit(1)
  }

  console.log('⚠️  ADVERTENCIA: Este script modificará la base de datos.')
  console.log('⚠️  Solo ejecutar en entorno de desarrollo.')
  console.log('Actualizando visitas con registros de salida...')

  // Obtener todas las visitas que no tienen salida
  const visits = await prisma.visit.findMany({
    where: {
      exitDate: null
    }
  })

  console.log(`Encontradas ${visits.length} visitas sin salida`)

  if (visits.length === 0) {
    console.log('No hay visitas para actualizar')
    return
  }

  // Obtener usuarios para asignar como registradores de salida
  const users = await prisma.user.findMany()
  if (users.length === 0) {
    console.log('No hay usuarios disponibles')
    return
  }

  let updatedCount = 0

  // Actualizar cada visita
  for (const visit of visits) {
    try {
      const exitTime = generateExitTime(visit.entryTime)
      const exitDate = calculateExitDate(visit.entryDate, visit.entryTime, exitTime)
      const exitUser = users[Math.floor(Math.random() * users.length)]

      await prisma.visit.update({
        where: { id: visit.id },
        data: {
          exitDate,
          exitTime,
          exitRegisteredBy: exitUser.username
        }
      })

      updatedCount++
      
      if (updatedCount % 100 === 0) {
        console.log(`Actualizadas ${updatedCount} de ${visits.length} visitas`)
      }
    } catch (error) {
      console.error(`Error actualizando visita ${visit.id}:`, error)
    }
  }

  console.log(`✅ Actualización completada`)
  console.log(`Total de visitas actualizadas: ${updatedCount}`)

  // Mostrar estadísticas
  const stats = await prisma.visit.groupBy({
    by: ['motivoCategoria'],
    _count: {
      motivoCategoria: true
    },
    where: {
      exitDate: { not: null }
    }
  })

  console.log('\n📊 Estadísticas de visitas con salida:')
  stats.forEach(stat => {
    console.log(`- ${stat.motivoCategoria}: ${stat._count.motivoCategoria} visitas`)
  })

  // Mostrar algunas estadísticas de tiempo
  const allVisits = await prisma.visit.findMany({
    where: {
      exitDate: { not: null }
    },
    select: {
      entryTime: true,
      exitTime: true,
      motivoCategoria: true
    }
  })

  if (allVisits.length > 0) {
    const stayTimes = allVisits.map(visit => {
      const [entryHour, entryMinute] = visit.entryTime.split(':').map(Number)
      const [exitHour, exitMinute] = visit.exitTime!.split(':').map(Number)
      const entryMinutes = entryHour * 60 + entryMinute
      const exitMinutes = exitHour * 60 + exitMinute
      return exitMinutes - entryMinutes
    })

    const avgStayTime = stayTimes.reduce((a, b) => a + b, 0) / stayTimes.length
    const minStayTime = Math.min(...stayTimes)
    const maxStayTime = Math.max(...stayTimes)

    console.log('\n⏱️ Estadísticas de tiempo de estadía:')
    console.log(`- Tiempo promedio: ${Math.round(avgStayTime)} minutos (${Math.round(avgStayTime/60)} horas)`)
    console.log(`- Tiempo mínimo: ${minStayTime} minutos`)
    console.log(`- Tiempo máximo: ${maxStayTime} minutos`)
  }
}

main()
  .catch((e) => {
    console.error('Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

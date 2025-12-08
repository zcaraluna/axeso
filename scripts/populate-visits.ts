import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

// Lista de motivos de visita
const motivosCategoria = [
  'Consulta',
  'Entrega de Documentos',
  'Citación',
  'Denuncia',
  'Visita a Director',
  'Prensa',
  'Otro'
]

// Nombres y apellidos para generar datos realistas
const nombres = [
  'MARIA', 'JOSE', 'ANA', 'CARLOS', 'ROSA', 'LUIS', 'CARMEN', 'ANTONIO', 'ISABEL', 'FRANCISCO',
  'JESUS', 'MERCEDES', 'MANUEL', 'DOLORES', 'JAVIER', 'PILAR', 'MIGUEL', 'TERESA', 'RAFAEL', 'JOSEFA',
  'FERNANDO', 'CRISTINA', 'ANGEL', 'MONICA', 'PEDRO', 'AMPARO', 'PABLO', 'ROCIO', 'ALBERTO', 'CONSUELO',
  'SERGIO', 'GLORIA', 'VICENTE', 'SOLEDAD', 'JORGE', 'VIRGINIA', 'RAMON', 'PATRICIA', 'ENRIQUE', 'MARTA'
]

const apellidos = [
  'GARCIA', 'RODRIGUEZ', 'GONZALEZ', 'FERNANDEZ', 'LOPEZ', 'MARTINEZ', 'SANCHEZ', 'PEREZ', 'GOMEZ', 'MARTIN',
  'JIMENEZ', 'RUIZ', 'HERNANDEZ', 'DIAZ', 'MORENO', 'MUNOZ', 'ROMERO', 'NAVARRO', 'TORRES', 'DOMINGUEZ',
  'VARGAS', 'RAMOS', 'GIL', 'RAMIREZ', 'SERRANO', 'BLANCO', 'MOLINA', 'MORALES', 'ORTEGA', 'DELGADO',
  'CASTRO', 'ORTIZ', 'RUBIO', 'MARIN', 'SANZ', 'IGLESIAS', 'MEDINA', 'CORTES', 'CASTILLO', 'GARRIDO'
]

// Descripciones de motivos
const descripcionesMotivos = {
  'Consulta': [
    'Consulta sobre trámites policiales',
    'Consulta sobre denuncias anteriores',
    'Consulta sobre procedimientos legales',
    'Consulta sobre documentación requerida',
    'Consulta general sobre servicios policiales'
  ],
  'Entrega de Documentos': [
    'Entrega de documentos de identidad',
    'Entrega de certificados policiales',
    'Entrega de constancias de antecedentes',
    'Entrega de documentación legal',
    'Entrega de formularios completados'
  ],
  'Citación': [
    'Citación para declaración',
    'Citación para reconocimiento',
    'Citación para audiencia',
    'Citación para testimonio',
    'Citación oficial'
  ],
  'Denuncia': [
    'Denuncia por robo',
    'Denuncia por agresión',
    'Denuncia por fraude',
    'Denuncia por violencia doméstica',
    'Denuncia por daños',
    'Denuncia por amenazas',
    'Denuncia por estafa'
  ],
  'Visita a Director': [
    'Reunión con Director General',
    'Audiencia con Director',
    'Consulta directiva',
    'Reunión de trabajo',
    'Presentación de propuesta'
  ],
  'Prensa': [
    'Entrevista periodística',
    'Cobertura de evento',
    'Solicitud de información',
    'Rueda de prensa',
    'Reportaje institucional'
  ],
  'Otro': [
    'Trámite administrativo',
    'Reunión de trabajo',
    'Capacitación',
    'Evento institucional',
    'Visita protocolaria'
  ]
}

// Generar datos aleatorios
function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)]
}

function getRandomDate(startDate: Date, endDate: Date): Date {
  const start = startDate.getTime()
  const end = endDate.getTime()
  return new Date(start + Math.random() * (end - start))
}

function getRandomTime(): string {
  const hour = Math.floor(Math.random() * 12) + 8 // 8 AM to 7 PM
  const minute = Math.floor(Math.random() * 60)
  return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
}

function generateRandomCedula(): string {
  return Math.floor(Math.random() * 9000000) + 1000000 + ''
}

function generateRandomPhone(): string {
  const prefixes = ['0981', '0982', '0983', '0984', '0985', '0986', '0987', '0988', '0989']
  const prefix = getRandomElement(prefixes)
  const number = Math.floor(Math.random() * 1000000) + 100000
  return prefix + number.toString().padStart(6, '0')
}

function generateRandomBirthDate(): Date {
  const year = 1950 + Math.floor(Math.random() * 50) // 1950-2000
  const month = Math.floor(Math.random() * 12)
  const day = Math.floor(Math.random() * 28) + 1
  return new Date(year, month, day)
}

function calculateAge(birthDate: Date): number {
  const today = new Date()
  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }
  return age
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
    console.error('Ejemplo: ALLOW_DATA_POPULATION=true npx tsx scripts/populate-visits.ts')
    process.exit(1)
  }

  console.log('⚠️  ADVERTENCIA: Este script poblará la base de datos con datos de prueba.')
  console.log('⚠️  Solo ejecutar en entorno de desarrollo.')
  console.log('Poblando base de datos con visitas...')

  // Obtener usuarios existentes
  const users = await prisma.user.findMany()
  if (users.length === 0) {
    console.log('No hay usuarios en la base de datos. Ejecuta primero el script seed.ts')
    return
  }

  const startDate = new Date('2025-01-01')
  const endDate = new Date('2025-10-23')
  
  console.log(`Generando visitas desde ${startDate.toLocaleDateString()} hasta ${endDate.toLocaleDateString()}`)

  const visits = []
  const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
  
  // Generar visitas para cada día
  for (let day = 0; day < totalDays; day++) {
    const currentDate = new Date(startDate)
    currentDate.setDate(currentDate.getDate() + day)
    
    // Saltar fines de semana (sábado y domingo)
    if (currentDate.getDay() === 0 || currentDate.getDay() === 6) {
      continue
    }
    
    // Generar entre 5 y 25 visitas por día laboral
    const visitsPerDay = Math.floor(Math.random() * 21) + 5
    
    for (let i = 0; i < visitsPerDay; i++) {
      const entryTime = getRandomTime()
      const motivo = getRandomElement(motivosCategoria)
      const descripcion = getRandomElement(descripcionesMotivos[motivo as keyof typeof descripcionesMotivos])
      const fechaNacimiento = generateRandomBirthDate()
      const edad = calculateAge(fechaNacimiento)
      const user = getRandomElement(users)
      
      const visit = {
        nombres: getRandomElement(nombres),
        apellidos: getRandomElement(apellidos),
        cedula: generateRandomCedula(),
        tipoDocumento: 'Cédula de Identidad',
        fechaNacimiento,
        edad,
        telefono: generateRandomPhone(),
        entryDate: currentDate.toLocaleDateString('es-PY', { 
          day: '2-digit', 
          month: '2-digit', 
          year: 'numeric' 
        }),
        entryTime,
        motivoCategoria: motivo,
        motivoDescripcion: descripcion,
        registeredBy: user.username,
        userId: user.id
      }
      
      visits.push(visit)
    }
  }

  console.log(`Generadas ${visits.length} visitas`)

  // Insertar visitas en lotes de 100
  const batchSize = 100
  for (let i = 0; i < visits.length; i += batchSize) {
    const batch = visits.slice(i, i + batchSize)
    await prisma.visit.createMany({
      data: batch,
      skipDuplicates: true
    })
    console.log(`Insertadas ${Math.min(i + batchSize, visits.length)} de ${visits.length} visitas`)
  }

  console.log('✅ Base de datos poblada exitosamente!')
  console.log(`Total de visitas creadas: ${visits.length}`)
  
  // Mostrar estadísticas
  const stats = await prisma.visit.groupBy({
    by: ['motivoCategoria'],
    _count: {
      motivoCategoria: true
    }
  })
  
  console.log('\n📊 Estadísticas por motivo:')
  stats.forEach(stat => {
    console.log(`- ${stat.motivoCategoria}: ${stat._count.motivoCategoria} visitas`)
  })
}

main()
  .catch((e) => {
    console.error('Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

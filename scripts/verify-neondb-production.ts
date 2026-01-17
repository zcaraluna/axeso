// Script para verificar la base de datos de producción usando pg directamente
import { Client } from 'pg'

const DATABASE_URL = "postgresql://neondb_owner:npg_ULITrcONW06t@ep-frosty-wave-a4yvo5ra-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require"

async function main() {
    const client = new Client({
        connectionString: DATABASE_URL,
    })

    try {
        console.log('🔍 Conectando a NeonDB...')
        await client.connect()
        console.log('✅ Conexión exitosa a NeonDB\n')

        // Verificar si existe la tabla users
        const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `)

        console.log('📊 Tablas en la base de datos:')
        tablesResult.rows.forEach(row => {
            console.log(`- ${row.table_name}`)
        })

        // Verificar columnas de la tabla users
        const columnsResult = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users'
      ORDER BY ordinal_position
    `)

        console.log('\n📋 Columnas en la tabla users:')
        const hasIsActive = columnsResult.rows.some(row => row.column_name === 'isActive')
        columnsResult.rows.forEach(row => {
            const marker = row.column_name === 'isActive' ? ' ⭐' : ''
            console.log(`- ${row.column_name} (${row.data_type})${marker}`)
        })

        console.log(`\n${hasIsActive ? '✅' : '❌'} Campo isActive ${hasIsActive ? 'EXISTE' : 'NO EXISTE'} en la base de datos`)

        // Contar registros
        const userCountResult = await client.query('SELECT COUNT(*) FROM users')
        const visitCountResult = await client.query('SELECT COUNT(*) FROM visits')

        console.log('\n📈 Estadísticas:')
        console.log(`- Usuarios: ${userCountResult.rows[0].count}`)
        console.log(`- Visitas: ${visitCountResult.rows[0].count}`)

        // Última visita
        const lastVisitResult = await client.query(`
      SELECT nombres, apellidos, "createdAt"
      FROM visits
      ORDER BY "createdAt" DESC
      LIMIT 1
    `)

        if (lastVisitResult.rows.length > 0) {
            const lastVisit = lastVisitResult.rows[0]
            console.log('\n🕐 Última visita registrada:')
            console.log(`- Nombre: ${lastVisit.nombres} ${lastVisit.apellidos}`)
            console.log(`- Fecha: ${lastVisit.createdAt}`)
        }

        // Listar usuarios
        const usersResult = await client.query(`
      SELECT username, nombres, apellidos
      FROM users
      ORDER BY "createdAt" DESC
      LIMIT 5
    `)

        console.log('\n👥 Usuarios recientes:')
        usersResult.rows.forEach(user => {
            console.log(`- ${user.username} (${user.nombres} ${user.apellidos})`)
        })

    } catch (error: any) {
        console.error('❌ Error:', error.message)
    } finally {
        await client.end()
    }
}

main()

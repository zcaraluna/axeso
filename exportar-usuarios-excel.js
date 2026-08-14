const ExcelJS = require('exceljs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

// Cargar variables de entorno desde .env
require('dotenv').config();

// Redirigir URLs de base de datos si apuntan a la IP privada interna (10.0.1.11) 
// para usar la IP pública accesible desde fuera de la red local
if (process.env.DATABASE_URL) {
  process.env.POSTGRES_PRISMA_URL = process.env.DATABASE_URL;
  process.env.POSTGRES_URL_NON_POOLING = process.env.DATABASE_URL;
}

const prisma = new PrismaClient();

async function exportarUsuarios() {
  try {
    console.log('🔄 Conectando a la base de datos y obteniendo usuarios...');
    const users = await prisma.user.findMany({
      include: {
        _count: {
          select: {
            visits: true,
            codigosActivacion: true,
          },
        },
      },
      orderBy: {
        username: 'asc',
      },
    });
    
    if (users.length === 0) {
      console.log('⚠️ No se encontraron usuarios en la base de datos.');
      await prisma.$disconnect();
      return;
    }

    console.log(`✅ Se obtuvieron ${users.length} usuarios.`);

    // Columnas a exportar
    const columnsToExport = [
      { key: 'id', header: 'ID' },
      { key: 'username', header: 'USUARIO' },
      { key: 'nombres', header: 'NOMBRES' },
      { key: 'apellidos', header: 'APELLIDOS' },
      { key: 'cedula', header: 'CÉDULA' },
      { key: 'grado', header: 'GRADO' },
      { key: 'credencial', header: 'CREDENCIAL' },
      { key: 'role', header: 'ROL' },
      { key: 'telefono', header: 'TELÉFONO' },
      { key: 'isActive', header: 'ACTIVO' },
      { key: 'mustChangePassword', header: 'DEBE CAMBIAR CONTRASEÑA' },
      { key: 'visitsCount', header: 'CANTIDAD DE VISITAS REGISTRADAS' },
      { key: 'codigosCount', header: 'CÓDIGOS DE ACTIVACIÓN CREADOS' },
      { key: 'createdAt', header: 'FECHA DE CREACIÓN' },
      { key: 'updatedAt', header: 'ÚLTIMA ACTUALIZACIÓN' }
    ];

    // Crear el libro de Excel
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Usuarios de AXESO');

    // Configurar columnas de la hoja
    worksheet.columns = columnsToExport.map(col => ({
      header: col.header,
      key: col.key,
      width: 20
    }));

    // Aplicar estilos a la cabecera
    const headerRow = worksheet.getRow(1);
    headerRow.height = 28;
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF002147' } // Navy Blue del sistema AXESO
      };
      cell.font = {
        name: 'Segoe UI',
        size: 11,
        bold: true,
        color: { argb: 'FFFFFFFF' }
      };
      cell.alignment = {
        vertical: 'middle',
        horizontal: 'center'
      };
      cell.border = {
        bottom: { style: 'medium', color: { argb: 'FF000000' } }
      };
    });

    // Agregar datos de usuarios
    users.forEach((user) => {
      const rowData = {
        id: user.id,
        username: user.username,
        nombres: user.nombres || '',
        apellidos: user.apellidos || '',
        cedula: user.cedula || 'N/A',
        grado: user.grado || '',
        credencial: user.credencial || '',
        role: user.role || 'user',
        telefono: user.telefono || '',
        isActive: user.isActive ? 'SÍ' : 'NO',
        mustChangePassword: user.mustChangePassword ? 'SÍ' : 'NO',
        visitsCount: user._count.visits,
        codigosCount: user._count.codigosActivacion,
        createdAt: formatDate(user.createdAt),
        updatedAt: formatDate(user.updatedAt),
      };
      worksheet.addRow(rowData);
    });

    // Función auxiliar para formatear fechas a dd-mm-aaaa hh:mm:ss
    function formatDate(val) {
      if (val instanceof Date) {
        const d = String(val.getDate()).padStart(2, '0');
        const m = String(val.getMonth() + 1).padStart(2, '0');
        const y = val.getFullYear();
        const hh = String(val.getHours()).padStart(2, '0');
        const mm = String(val.getMinutes()).padStart(2, '0');
        const ss = String(val.getSeconds()).padStart(2, '0');
        return `${d}-${m}-${y} ${hh}:${mm}:${ss}`;
      }
      return val || '';
    }

    // Estilizar las celdas de datos
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Saltar cabecera
      
      row.height = 20;
      
      // Alternar color de fila para legibilidad (zebra striping)
      const isEven = rowNumber % 2 === 0;
      const fill = isEven ? {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF9FAFB' }
      } : null;

      row.eachCell((cell) => {
        cell.font = {
          name: 'Segoe UI',
          size: 10
        };
        
        // Alinear números a la derecha y texto a la izquierda
        const isNum = typeof cell.value === 'number';
        cell.alignment = {
          vertical: 'middle',
          horizontal: isNum ? 'right' : 'left'
        };

        if (fill) cell.fill = fill;
        cell.border = {
          bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } }
        };
      });
    });

    // Auto-ajustar el ancho de las columnas según su contenido
    worksheet.columns.forEach((column) => {
      let maxLen = 0;
      column.eachCell({ includeEmpty: true }, (cell) => {
        const val = cell.value ? cell.value.toString() : '';
        if (val.length > maxLen) {
          maxLen = val.length;
        }
      });
      column.width = Math.max(maxLen + 4, 15);
    });

    // Guardar el archivo Excel en el directorio raíz del proyecto
    const outputPath = path.join(__dirname, 'usuarios_sistema.xlsx');
    await workbook.xlsx.writeFile(outputPath);
    console.log(`\n🎉 Archivo Excel creado con éxito en: ${outputPath}`);

    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Error durante la exportación a Excel:', error);
    await prisma.$disconnect();
  }
}

exportarUsuarios();

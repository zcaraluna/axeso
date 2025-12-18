import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function verificarDispositivos() {
  try {
    console.log('🔍 Verificando dispositivos en la base de datos...\n');

    // Obtener TODOS los dispositivos sin filtros
    const dispositivos = await prisma.dispositivoAutorizado.findMany({
      include: {
        codigoActivacion: true,
      },
      orderBy: {
        autorizadoEn: 'desc',
      },
    });

    console.log(`📊 Total de dispositivos encontrados: ${dispositivos.length}\n`);

    if (dispositivos.length === 0) {
      console.log('⚠️  No hay dispositivos en la base de datos');
      return;
    }

    dispositivos.forEach((d, index) => {
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`Dispositivo ${index + 1}:`);
      console.log(`  ID: ${d.id}`);
      console.log(`  Nombre: ${d.nombre || 'Sin nombre'}`);
      console.log(`  Fingerprint: ${d.fingerprint.substring(0, 16)}...`);
      console.log(`  Activo: ${d.activo ? '✅ Sí' : '❌ No'}`);
      console.log(`  IP: ${d.ipAddress || 'N/A'}`);
      console.log(`  Autorizado en: ${d.autorizadoEn.toLocaleString('es-PY')}`);
      console.log(`  Último acceso: ${d.ultimoAcceso.toLocaleString('es-PY')}`);
      console.log(`  Código ID: ${d.codigoActivacionId || 'Sin código asociado'}`);
      if (d.codigoActivacion) {
        console.log(`  Código: ${d.codigoActivacion.codigo}`);
        console.log(`  Código usado: ${d.codigoActivacion.usado ? 'Sí' : 'No'}`);
        console.log(`  Código activo: ${d.codigoActivacion.activo ? 'Sí' : 'No'}`);
        console.log(`  Código expira: ${d.codigoActivacion.expiraEn ? d.codigoActivacion.expiraEn.toLocaleDateString('es-PY') : 'Sin expiración'}`);
      } else {
        console.log(`  Código: ❌ Sin código asociado`);
      }
      console.log('');
    });

    // Verificar códigos sin dispositivo asociado
    const codigos = await prisma.codigoActivacion.findMany({
      where: {
        usado: true,
      },
      include: {
        dispositivos: true,
      },
    });

    const codigosSinDispositivo = codigos.filter(c => c.dispositivos.length === 0);
    if (codigosSinDispositivo.length > 0) {
      console.log(`\n⚠️  Códigos usados sin dispositivo asociado: ${codigosSinDispositivo.length}`);
      codigosSinDispositivo.forEach(c => {
        console.log(`  - Código: ${c.codigo}, Nombre: ${c.nombre || 'Sin nombre'}, Fingerprint: ${c.dispositivoFingerprint || 'N/A'}`);
        
        // Buscar si hay un dispositivo con ese fingerprint
        if (c.dispositivoFingerprint) {
          const dispositivoConFingerprint = dispositivos.find(d => d.fingerprint === c.dispositivoFingerprint);
          if (dispositivoConFingerprint) {
            console.log(`    → ⚠️  Existe un dispositivo con este fingerprint pero no está asociado!`);
            console.log(`    → Dispositivo ID: ${dispositivoConFingerprint.id}, Nombre: ${dispositivoConFingerprint.nombre}`);
          }
        }
      });
    }

    // Verificar si hay dispositivos desactivados que podrían ser el "tercero"
    const dispositivosDesactivados = dispositivos.filter(d => !d.activo);
    if (dispositivosDesactivados.length > 0) {
      console.log(`\n📋 Dispositivos desactivados: ${dispositivosDesactivados.length}`);
      dispositivosDesactivados.forEach(d => {
        console.log(`  - ${d.nombre || 'Sin nombre'} (ID: ${d.id})`);
      });
    }

    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Error:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

verificarDispositivos();


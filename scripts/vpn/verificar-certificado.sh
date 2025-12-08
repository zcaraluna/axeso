#!/bin/bash

# Script para verificar si un certificado existe en la base de datos
# Uso: sudo bash scripts/vpn/verificar-certificado.sh <certificate_name>

set -e

PROJECT_DIR="/home/cyberpol/web/visitantes.cyberpol.com.py/public_html"
CERT_NAME="${1:-ADMIN-GARV1}"

echo "=========================================="
echo "VERIFICACIÓN DE CERTIFICADO"
echo "=========================================="
echo ""

cd "$PROJECT_DIR"

# Verificar usando Prisma directamente
echo "Buscando certificado: $CERT_NAME"
echo ""

node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const cert = await prisma.vpnCertificate.findUnique({
      where: { certificateName: '$CERT_NAME' }
    });
    
    if (cert) {
      console.log('✓ Certificado encontrado:');
      console.log('  ID:', cert.id);
      console.log('  Nombre:', cert.certificateName);
      console.log('  Estado:', cert.status);
      console.log('  Creado:', cert.createdAt);
      console.log('  Último uso:', cert.lastUsedAt || 'Nunca');
      console.log('  IP actual:', cert.ipAddress || 'N/A');
    } else {
      console.log('✗ Certificado NO encontrado en la base de datos');
      console.log('');
      console.log('Certificados existentes:');
      const allCerts = await prisma.vpnCertificate.findMany({
        select: { certificateName: true, status: true },
        take: 10
      });
      allCerts.forEach(c => {
        console.log('  -', c.certificateName, '(' + c.status + ')');
      });
    }
    
    await prisma.\$disconnect();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
})();
"


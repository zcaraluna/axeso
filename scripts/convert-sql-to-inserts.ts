/**
 * Script para convertir datos COPY del SQL a INSERT statements
 * Uso: npx tsx scripts/convert-sql-to-inserts.ts
 */

import * as fs from 'fs';
import * as path from 'path';

const sqlFile = path.join(__dirname, '..', 'backup_neondb_20260107_022318.sql');
const outputFile = path.join(__dirname, '..', 'backup_neondb_inserts.sql');

console.log('📖 Leyendo archivo SQL...');
const content = fs.readFileSync(sqlFile, 'utf-8');

console.log('🔄 Convirtiendo COPY a INSERT statements...');

const lines = content.split('\n');
let output: string[] = [];
let inCopyBlock = false;
let currentTable = '';
let currentColumns: string[] = [];
let insertStatements: string[] = [];

for (let i = 0; i < lines.length; i++) {
  const line = lines[i].trim();
  
  // Detectar inicio de COPY
  if (line.startsWith('COPY public.')) {
    const match = line.match(/COPY public\.(\w+)\s*\(([^)]+)\)/);
    if (match) {
      currentTable = match[1];
      currentColumns = match[2].split(',').map(c => c.trim().replace(/"/g, ''));
      inCopyBlock = true;
      console.log(`  Procesando tabla: ${currentTable}`);
      continue;
    }
  }
  
  // Detectar fin de COPY (\.)
  if (line === '\\.' || line === '.') {
    inCopyBlock = false;
    continue;
  }
  
  // Si estamos en un bloque COPY y la línea tiene datos
  if (inCopyBlock && line && !line.startsWith('--') && line !== '') {
    // Los datos están separados por tabulaciones
    const values = line.split('\t');
    
    // Escapar valores para SQL
    const escapedValues = values.map(val => {
      if (val === '\\N' || val === '') {
        return 'NULL';
      }
      // Escapar comillas simples
      const escaped = val.replace(/'/g, "''");
      return `'${escaped}'`;
    });
    
    const insert = `INSERT INTO public.${currentTable} (${currentColumns.map(c => `"${c}"`).join(', ')}) VALUES (${escapedValues.join(', ')});`;
    insertStatements.push(insert);
  }
}

console.log(`✅ Generados ${insertStatements.length} INSERT statements`);

// Escribir el archivo de salida
fs.writeFileSync(outputFile, insertStatements.join('\n'), 'utf-8');

console.log(`📝 Archivo generado: ${outputFile}`);
console.log(`💡 Ahora puedes copiar y pegar este archivo en el SQL Editor de NeonDB`);



# Instrucciones para Aplicar Migración en el VPS

## 📋 Pasos para Aplicar la Migración de Dispositivos Autorizados

### Opción 1: Usando Prisma Migrate (Recomendado)

1. **Conectarte al VPS:**
```bash
ssh usuario@tu-vps
```

2. **Ir al directorio del proyecto:**
```bash
cd /ruta/a/tu/proyecto
# Ejemplo: cd /home/cyberpol/web/visitantes.cyberpol.com.py/public_html
```

3. **Hacer backup de la base de datos (IMPORTANTE):**
```bash
# Crear backup antes de migrar
pg_dump -U controldeacceso -d controldeacceso > backup_antes_migracion_$(date +%Y%m%d_%H%M%S).sql
```

4. **Actualizar el código desde Git:**
```bash
git pull origin main
# o la rama que uses
```

5. **Instalar dependencias si hay nuevas:**
```bash
npm ci
```

6. **Aplicar la migración:**
```bash
npx prisma migrate deploy
```

Este comando aplicará automáticamente la migración `20250101000000_add_dispositivos_autorizados` que crea las tablas necesarias.

7. **Regenerar Prisma Client:**
```bash
npx prisma generate
```

8. **Recompilar la aplicación:**
```bash
npm run build
```

9. **Reiniciar la aplicación:**
```bash
pm2 restart axeso
# o el nombre que uses para tu proceso
```

---

### Opción 2: Ejecutar SQL Manualmente (Si Prisma Migrate falla)

Si por alguna razón `prisma migrate deploy` no funciona, puedes ejecutar el SQL manualmente:

1. **Conectarte a PostgreSQL:**
```bash
psql -U controldeacceso -d controldeacceso
```

2. **Ejecutar el SQL de la migración:**
```sql
-- Copiar y pegar el contenido de:
-- prisma/migrations/20250101000000_add_dispositivos_autorizados/migration.sql
```

O ejecutarlo directamente desde archivo:
```bash
psql -U controldeacceso -d controldeacceso < prisma/migrations/20250101000000_add_dispositivos_autorizados/migration.sql
```

3. **Regenerar Prisma Client:**
```bash
npx prisma generate
```

4. **Recompilar y reiniciar:**
```bash
npm run build
pm2 restart axeso
```

---

### Opción 3: Usando el Script de Actualización

Si ya tienes el script `scripts/update.sh` configurado:

```bash
./scripts/update.sh
```

Este script automáticamente:
- Hace backup
- Actualiza código
- Instala dependencias
- Ejecuta `npx prisma migrate deploy`
- Recompila
- Reinicia la aplicación

---

## ✅ Verificar que Funcionó

Después de aplicar la migración, verifica que las tablas se crearon:

```bash
psql -U controldeacceso -d controldeacceso -c "\dt codigos_activacion dispositivos_autorizados"
```

Deberías ver ambas tablas listadas.

---

## 🔧 Generar Primer Código de Activación en el VPS

Una vez aplicada la migración, puedes generar tu primer código:

```bash
npx tsx scripts/generar-codigo-activacion.ts 30 "Servidor Principal"
```

---

## ⚠️ Notas Importantes

1. **Backup siempre primero**: Nunca ejecutes migraciones sin hacer backup
2. **Horario de mantenimiento**: Aplica migraciones en horarios de bajo tráfico
3. **Verificar variables de entorno**: Asegúrate de que `DATABASE_URL` esté correctamente configurado en `.env.local`
4. **Logs**: Revisa los logs después de reiniciar: `pm2 logs axeso`

---

## 🆘 Si Algo Sale Mal

Si la migración falla:

1. **Restaurar backup:**
```bash
psql -U controldeacceso -d controldeacceso < backup_antes_migracion_YYYYMMDD_HHMMSS.sql
```

2. **Revisar logs de Prisma:**
```bash
npx prisma migrate status
```

3. **Verificar esquema:**
```bash
npx prisma db pull
npx prisma format
```


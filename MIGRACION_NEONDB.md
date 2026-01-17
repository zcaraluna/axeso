# Guía de Migración: VPS a NeonDB

Esta guía te ayudará a migrar tu base de datos PostgreSQL del VPS a NeonDB, manteniendo todos tus datos y configuraciones.

## 📋 Prerrequisitos

- Acceso SSH al VPS donde está la base de datos actual
- Cuenta en [NeonDB](https://neon.tech) (puedes crear una gratis)
- Acceso al dashboard de Vercel para actualizar variables de entorno
- Herramienta `pg_dump` instalada en tu VPS (generalmente viene con PostgreSQL)

## 🚀 Pasos de Migración

### Paso 1: Exportar los Datos del VPS

**Credenciales de tu base de datos:**
- Usuario: `postgres`
- Contraseña: `admin123`
- Base de datos: `controldeacceso`
- Host: `localhost` (en el VPS)

#### Opción A: Usando el Script Automatizado (Recomendado)

1. **Conectarse al VPS:**
```bash
ssh usuario@tu-vps
```

2. **Navegar al directorio del proyecto (si existe) o crear un directorio temporal:**
```bash
cd ~
# o si tienes el proyecto clonado:
cd /ruta/a/tu/proyecto
```

3. **Ejecutar el script de exportación:**
```bash
# Si tienes el proyecto con el script:
chmod +x scripts/export-from-vps.sh
./scripts/export-from-vps.sh

# El script creará los backups automáticamente
```

4. **Descargar el backup a tu máquina local:**
```bash
# Desde tu máquina local (no desde el VPS)
scp usuario@tu-vps:~/backups_neondb/backup_neondb_*.dump ./
# o
scp usuario@tu-vps:~/backups_neondb/backup_neondb_*.sql ./
```

#### Opción B: Comandos Manuales

1. **Conectarse al VPS:**
```bash
ssh usuario@tu-vps
```

2. **Crear un backup completo de la base de datos:**

**Si estás ejecutando como root o otro usuario (no postgres), usa una de estas opciones:**

**Opción 1: Forzar conexión TCP con localhost (Recomendado)**
```bash
# Asegúrate de estar en un directorio con espacio suficiente
cd ~
mkdir -p backups_neondb
cd backups_neondb

# Crear backup con formato custom (recomendado)
# Usar -h localhost para forzar conexión TCP y evitar autenticación peer
export PGPASSWORD="admin123"
pg_dump -h localhost -U postgres -d controldeacceso -F c -f backup_neondb_$(date +%Y%m%d_%H%M%S).dump

# O si prefieres formato SQL plano:
pg_dump -h localhost -U postgres -d controldeacceso > backup_neondb_$(date +%Y%m%d_%H%M%S).sql

# Limpiar la variable de entorno por seguridad
unset PGPASSWORD
```

**Opción 2: Ejecutar como usuario postgres**
```bash
# Cambiar al usuario postgres
sudo -u postgres pg_dump -d controldeacceso -F c -f ~/backup_neondb_$(date +%Y%m%d_%H%M%S).dump

# O con formato SQL:
sudo -u postgres pg_dump controldeacceso > ~/backup_neondb_$(date +%Y%m%d_%H%M%S).sql
```

**Opción 3: Cambiar de usuario con su**
```bash
# Cambiar al usuario postgres
su - postgres

# Ejecutar el backup
pg_dump -d controldeacceso -F c -f backup_neondb_$(date +%Y%m%d_%H%M%S).dump

# Salir del usuario postgres
exit
```

**Nota:** Si usas la Opción 1 con `-h localhost` y `PGPASSWORD`, PostgreSQL usará autenticación por contraseña. Si usas las opciones 2 o 3, no necesitas especificar la contraseña.

3. **Verificar que el backup se creó correctamente:**
```bash
ls -lh backup_neondb_*.dump
# o
ls -lh backup_neondb_*.sql
```

4. **Descargar el backup a tu máquina local:**
```bash
# Desde tu máquina local (no desde el VPS)
scp usuario@tu-vps:~/backups_neondb/backup_neondb_*.dump ./
# o
scp usuario@tu-vps:~/backups_neondb/backup_neondb_*.sql ./
```

### Paso 2: Configurar NeonDB

1. **Crear cuenta en NeonDB:**
   - Visita [https://neon.tech](https://neon.tech)
   - Regístrate o inicia sesión

2. **Crear un nuevo proyecto:**
   - En el dashboard, haz clic en "Create Project"
   - Elige un nombre para tu proyecto (ej: "axeso-production")
   - Selecciona la región más cercana a tus usuarios
   - PostgreSQL versión: usa la misma que tengas en VPS o la más reciente compatible

3. **Obtener la cadena de conexión:**
   - En el dashboard de NeonDB, ve a tu proyecto
   - Haz clic en "Connection Details" o "Connection String"
   - Copia la **Connection String** (se verá algo como):
     ```
     postgresql://usuario:password@ep-xxx-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require
     ```
   - **IMPORTANTE:** Asegúrate de copiar la versión con SSL habilitado (incluye `?sslmode=require`)

4. **Nota sobre conexiones directas vs pooling:**
   - NeonDB ofrece dos tipos de conexión:
     - **Direct connection**: Para desarrollo y conexiones simples
     - **Pooled connection**: Para producción con muchas conexiones simultáneas
   - Para Vercel, usa la **connection string con pooling** (si está disponible) o la directa
   - La diferencia en la URL es que las pooled tienen un puerto diferente o sufijo `-pooler`

### Paso 3: Importar los Datos a NeonDB

#### Opción A: Usando SQL (Recomendado - Más fácil) ⭐

**Si ya tienes un backup en formato .sql o quieres crear uno nuevo:**

1. **Si necesitas crear un backup SQL desde el VPS:**
```bash
# En el VPS
cd ~
export PGPASSWORD="admin123"
pg_dump -h localhost -U postgres -d controldeacceso > backup_neondb_$(date +%Y%m%d_%H%M%S).sql
unset PGPASSWORD
```

2. **Importar el archivo SQL a NeonDB:**

**Desde MobaXterm o terminal (si tienes psql):**
```bash
# Verifica si tienes psql
which psql

# Si tienes psql, importa directamente:
psql "postgresql://neondb_owner:npg_ULITrcONW06t@ep-frosty-wave-a4yvo5ra-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require" \
  < backup_neondb_*.sql
```

**Desde PowerShell en Windows (si instalaste PostgreSQL client):**
```powershell
# Navega a la carpeta del proyecto
cd C:\Users\recal\Documents\GitHub\axeso

# Importa el SQL
psql "postgresql://neondb_owner:npg_ULITrcONW06t@ep-frosty-wave-a4yvo5ra-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require" -f backup_neondb_*.sql
```

**O usando el SQL Editor de NeonDB (más fácil si no tienes psql):**
1. Ve al dashboard de NeonDB
2. Haz clic en "SQL Editor"
3. Abre el archivo `.sql` en un editor de texto
4. Copia y pega el contenido en el SQL Editor
5. Ejecuta el script

**Nota:** Si el archivo SQL es muy grande, es mejor usar `psql` desde la línea de comandos.

#### Opción B: Usando pg_restore (si exportaste con formato custom .dump)

1. **Instalar PostgreSQL client localmente:**
   - **Windows:** Descargar desde [postgresql.org](https://www.postgresql.org/download/windows/)
   - **Mac:** `brew install postgresql`
   - **Linux:** `sudo apt install postgresql-client` (Ubuntu/Debian)

2. **Importar el backup:**
```bash
# Usar la connection string de NeonDB
pg_restore -d "postgresql://usuario:password@ep-xxx-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require" \
  --no-owner --no-privileges backup_neondb_*.dump
```

#### Opción C: Usando Prisma Migrate (Recomendado para estructuras limpias)

Si prefieres empezar con una estructura limpia y solo migrar los datos:

1. **Aplicar el schema a NeonDB:**
```bash
# Configurar temporalmente la DATABASE_URL
export DATABASE_URL="postgresql://usuario:password@ep-xxx-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require"

# Aplicar migraciones
npx prisma migrate deploy
```

2. **Importar solo los datos (sin estructura):**
   - Editar el archivo SQL del backup para remover comandos `CREATE TABLE`, `CREATE INDEX`, etc.
   - O usar `pg_dump` con la opción `--data-only` del VPS:
   ```bash
   # En el VPS (si estás como root, usar -h localhost)
   export PGPASSWORD="admin123"
   pg_dump -h localhost -U postgres -d controldeacceso --data-only > data_only_backup.sql
   unset PGPASSWORD
   
   # O ejecutar como usuario postgres:
   sudo -u postgres pg_dump controldeacceso --data-only > data_only_backup.sql
   ```

### Paso 4: Verificar la Importación

1. **Conectarse a NeonDB y verificar:**
```bash
psql "postgresql://usuario:password@ep-xxx-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require"
```

2. **Dentro de psql, verificar las tablas:**
```sql
\dt
-- Deberías ver: users, visits, codigos_activacion, dispositivos_autorizados
```

3. **Verificar algunos datos:**
```sql
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM visits;
-- Comparar estos números con los de tu base de datos original
```

4. **Salir de psql:**
```sql
\q
```

### Paso 5: Actualizar Variables de Entorno en Vercel

1. **Acceder al dashboard de Vercel:**
   - Ve a [https://vercel.com](https://vercel.com)
   - Selecciona tu proyecto

2. **Ir a Settings > Environment Variables:**
   - En el menú lateral, haz clic en "Settings"
   - Luego en "Environment Variables"

3. **Actualizar DATABASE_URL:**
   - Busca la variable `DATABASE_URL`
   - Haz clic en "Edit"
   - Reemplaza el valor con la connection string de NeonDB
   - Asegúrate de seleccionar todos los entornos (Production, Preview, Development)
   - Guarda los cambios

4. **Otras variables que puedes verificar:**
   - `NEXTAUTH_SECRET`: Déjala igual
   - `NEXT_PUBLIC_SITE_URL`: Déjala igual
   - `NODE_ENV`: Déjala igual

### Paso 6: Regenerar Prisma Client y Verificar

1. **En tu máquina local, actualizar Prisma:**
```bash
# Actualizar la DATABASE_URL en tu .env.local (solo para probar)
# Usar la connection string de NeonDB

# Regenerar Prisma Client
npx prisma generate

# (Opcional) Verificar la conexión con Prisma Studio
npx prisma studio
```

2. **Hacer un deploy en Vercel:**
   - Puedes hacer un nuevo deploy o simplemente esperar el siguiente deploy automático
   - Los cambios en variables de entorno se aplican en el próximo deploy

3. **Verificar los logs de Vercel:**
   - En el dashboard de Vercel, ve a "Deployments"
   - Selecciona el último deployment
   - Revisa los logs para asegurarte de que no hay errores de conexión

### Paso 7: Probar la Aplicación

1. **Probar funcionalidades críticas:**
   - Iniciar sesión
   - Crear un nuevo registro de visita
   - Consultar historial
   - Exportar datos

2. **Verificar en NeonDB que los datos se están guardando:**
   - Accede al dashboard de NeonDB
   - Ve a "SQL Editor"
   - Ejecuta algunas consultas para verificar que los datos nuevos se están guardando

## 🔧 Configuración Adicional para NeonDB

### Configurar Connection Pooling (Recomendado)

NeonDB ofrece connection pooling para mejorar el rendimiento. Para habilitarlo:

1. **Usar la URL de pooling:**
   - En el dashboard de NeonDB, busca "Connection pooling"
   - Copia la connection string de pooling (tiene un formato similar pero con un sufijo diferente)
   - Actualiza `DATABASE_URL` en Vercel con esta nueva URL

2. **Configurar Prisma para usar pooling:**
   - En `prisma/schema.prisma`, puedes agregar parámetros adicionales si es necesario
   - Normalmente no es necesario cambiar nada, solo usar la URL correcta

### Optimizar para Vercel Serverless

NeonDB está optimizado para serverless, pero puedes ajustar algunas cosas:

1. **Connection timeout:**
   - NeonDB maneja bien las conexiones efímeras de serverless
   - No necesitas configuración adicional

2. **Verificar el cliente de Prisma:**
   - Asegúrate de que `lib/prisma.ts` use el singleton pattern (ya lo tienes correctamente)

## 🛡️ Seguridad Post-Migración

1. **Validar que el VPS ya no se está usando:**
   - Espera unos días después de la migración
   - Verifica los logs de tu VPS para confirmar que no hay conexiones
   - Puedes desactivar PostgreSQL en el VPS temporalmente para probar

2. **Hacer backup del VPS antes de desactivarlo:**
   ```bash
   # Un último backup por si acaso (usando conexión TCP)
   export PGPASSWORD="admin123"
   pg_dump -h localhost -U postgres -d controldeacceso > backup_final_antes_desactivar_$(date +%Y%m%d).sql
   unset PGPASSWORD
   
   # O ejecutar como usuario postgres:
   sudo -u postgres pg_dump controldeacceso > backup_final_antes_desactivar_$(date +%Y%m%d).sql
   ```

3. **Guardar los backups en un lugar seguro:**
   - Almacena los backups de forma segura (no en el mismo VPS)
   - Considera usar un servicio de almacenamiento en la nube

## 🐛 Solución de Problemas

### Error: "SSL connection required"
- **Solución:** Asegúrate de que la connection string incluye `?sslmode=require`

### Error: "Too many connections"
- **Solución:** Usa la connection string con pooling de NeonDB

### Error: "Peer authentication failed for user postgres"
- **Solución:** Este error ocurre cuando PostgreSQL usa autenticación peer. Soluciones:
  1. Usar `-h localhost` en el comando pg_dump para forzar conexión TCP
  2. Ejecutar como usuario postgres: `sudo -u postgres pg_dump ...`
  3. Cambiar de usuario: `su - postgres` y luego ejecutar pg_dump

### Error: "Role does not exist"
- **Solución:** Si usaste `pg_restore`, asegúrate de usar las flags `--no-owner --no-privileges`

### Los datos no se importaron correctamente
- **Solución:** Verifica que el encoding del backup sea UTF-8
- Intenta importar tabla por tabla si es necesario

### Prisma no puede conectarse
- **Solución:** 
  1. Verifica que la `DATABASE_URL` en Vercel esté correcta
  2. Asegúrate de que el formato de la URL es correcto
  3. Verifica que NeonDB permite conexiones desde la IP de Vercel (generalmente ya está configurado)

## 📚 Recursos Adicionales

- [Documentación de NeonDB](https://neon.tech/docs)
- [Migración a NeonDB](https://neon.tech/docs/guides/migrate-from-postgres)
- [Configuración de Prisma con NeonDB](https://neon.tech/docs/integrations/prisma)

## ✅ Checklist Final

- [ ] Backup de VPS creado y descargado
- [ ] Proyecto en NeonDB creado
- [ ] Datos importados a NeonDB
- [ ] Datos verificados en NeonDB
- [ ] `DATABASE_URL` actualizada en Vercel
- [ ] Deploy realizado en Vercel
- [ ] Aplicación probada y funcionando
- [ ] Logs verificados sin errores
- [ ] Backup final guardado de forma segura

## 🎉 ¡Migración Completada!

Una vez completados todos los pasos y verificaciones, tu aplicación debería estar funcionando con NeonDB. El sistema seguirá funcionando exactamente igual, pero ahora con una base de datos en la nube más escalable y fácil de mantener.


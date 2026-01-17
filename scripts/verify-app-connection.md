# Verificar que la App está Conectada a NeonDB

## Pasos para Verificar

### 1. Verificar Variables de Entorno en Vercel

1. Ve a [https://vercel.com](https://vercel.com)
2. Selecciona tu proyecto
3. Ve a **Settings > Environment Variables**
4. Busca `DATABASE_URL`
5. Verifica que contenga:
   - `neon.tech` o `neondb` en la URL
   - **NO** debe contener `localhost` o la IP del VPS

**Connection string correcta debería verse así:**
```
postgresql://neondb_owner:password@ep-xxx-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require
```

### 2. Actualizar Variables de Entorno (si es necesario)

Si `DATABASE_URL` aún apunta al VPS:
1. Haz clic en "Edit" en la variable `DATABASE_URL`
2. Reemplaza con la connection string de NeonDB:
   ```
   postgresql://neondb_owner:npg_ULITrcONW06t@ep-frosty-wave-a4yvo5ra-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require
   ```
3. Selecciona todos los entornos (Production, Preview, Development)
4. Guarda los cambios
5. **Haz un nuevo deploy** (los cambios en variables de entorno requieren un nuevo deploy)

### 3. Verificar desde la Aplicación Local

1. Crea/actualiza `.env.local` con la connection string de NeonDB:
   ```bash
   DATABASE_URL="postgresql://neondb_owner:npg_ULITrcONW06t@ep-frosty-wave-a4yvo5ra-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require"
   ```

2. Ejecuta el script de verificación:
   ```bash
   npx tsx scripts/verify-app-connection.ts
   ```

### 4. Verificar en la Aplicación Web

1. **Inicia sesión** en tu aplicación web
2. **Verifica que los datos se muestren correctamente:**
   - Lista de visitas
   - Usuarios
   - Buscar "JESUS ANDRES SANCHEZ CACERES" - debería aparecer con fecha de salida

3. **Prueba crear un nuevo registro:**
   - Crea una nueva visita
   - Verifica que se guarde correctamente
   - Verifica en NeonDB SQL Editor que el registro aparezca

### 5. Verificar Logs de Vercel

1. Ve a **Deployments** en Vercel
2. Selecciona el último deployment
3. Revisa los logs:
   - **No debe haber errores** de conexión a la base de datos
   - Busca mensajes como "Connected to database" o similares

### 6. Verificación Directa en NeonDB

1. Ve al SQL Editor de NeonDB
2. Ejecuta:
   ```sql
   SELECT COUNT(*) as total_visits FROM public.visits;
   SELECT COUNT(*) as total_users FROM public.users;
   ```
3. Compara estos números con los que ves en tu aplicación web

### 7. Prueba Final: Crear un Registro de Prueba

1. En tu aplicación web, crea una visita de prueba
2. En NeonDB SQL Editor, ejecuta:
   ```sql
   SELECT * FROM public.visits ORDER BY "createdAt" DESC LIMIT 1;
   ```
3. Si ves el registro que acabas de crear, **¡estás conectado a NeonDB!**

## ✅ Checklist de Verificación

- [ ] `DATABASE_URL` en Vercel apunta a NeonDB (contiene `neon.tech`)
- [ ] Se hizo un nuevo deploy después de actualizar variables de entorno
- [ ] La aplicación carga datos correctamente
- [ ] Se puede crear nuevos registros
- [ ] Los registros aparecen en NeonDB SQL Editor
- [ ] No hay errores en los logs de Vercel
- [ ] El registro de "JESUS ANDRES SANCHEZ CACERES" aparece con datos de salida

## 🚨 Si Algo No Funciona

1. **Verifica que hiciste un nuevo deploy** después de cambiar variables de entorno
2. **Verifica que la connection string es correcta** (sin espacios, con `?sslmode=require`)
3. **Revisa los logs de Vercel** para ver errores específicos
4. **Prueba la conexión localmente** con el script de verificación


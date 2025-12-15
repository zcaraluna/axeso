# Aplicar Migración isActive - Sin Resetear Datos

Este documento explica cómo aplicar la migración del campo `isActive` sin perder datos.

## ⚠️ IMPORTANTE: NO usar `prisma migrate dev` en producción

El comando `prisma migrate dev` puede detectar drift y querer resetear la base de datos. **NO lo uses en producción**.

## ✅ Solución Segura (Recomendada)

### Opción 1: Usar el Script Automático

Ejecuta en el servidor:

```bash
cd /home/cyberpol/web/visitantes.cyberpol.com.py/public_html
chmod +x scripts/aplicar-migracion-isactive.sh
bash scripts/aplicar-migracion-isactive.sh
```

Este script:
- ✅ Verifica si el campo ya existe
- ✅ Solo agrega el campo si no existe
- ✅ Marca la migración como aplicada
- ✅ Regenera el cliente de Prisma
- ✅ **NO resetea ni borra datos**

### Opción 2: Aplicar Manualmente

Si prefieres hacerlo manualmente:

```bash
cd /home/cyberpol/web/visitantes.cyberpol.com.py/public_html

# 1. Verificar si el campo existe
sudo -u postgres psql controldeacceso -c "\d users" | grep isActive

# 2. Si NO existe, agregarlo manualmente
sudo -u postgres psql controldeacceso -c "ALTER TABLE users ADD COLUMN IF NOT EXISTS \"isActive\" BOOLEAN NOT NULL DEFAULT true;"

# 3. Marcar la migración como aplicada
npx prisma migrate resolve --applied 20251215230015_add_user_is_active

# 4. Regenerar cliente de Prisma
npx prisma generate

# 5. Reconstruir aplicación
npm run build

# 6. Reiniciar PM2
pm2 restart axeso --update-env
```

### Opción 3: Usar `prisma migrate deploy` (Solo si no hay drift)

Si Prisma no detecta drift:

```bash
npx prisma migrate deploy
npx prisma generate
npm run build
pm2 restart axeso --update-env
```

## 🔍 Verificar que Funcionó

```bash
# Verificar que el campo existe
sudo -u postgres psql controldeacceso -c "SELECT username, \"isActive\" FROM users LIMIT 5;"

# Verificar estado de migraciones
npx prisma migrate status
```

## ⚠️ Si Prisma Sigue Detectando Drift

Si después de aplicar la migración, Prisma sigue detectando drift con `hasPassword` y `passwordHash`:

```bash
# Marcar esa migración como aplicada también
npx prisma migrate resolve --applied 20251209013407_add_password_fields_to_vpn_certificates
```

## ✅ Después de Aplicar

1. Verificar que el campo existe: `SELECT "isActive" FROM users LIMIT 1;`
2. Reconstruir: `npm run build`
3. Reiniciar: `pm2 restart axeso --update-env`
4. Probar: Iniciar sesión y verificar que funciona

## 🛡️ Seguridad

- ✅ Todos los usuarios existentes quedarán con `isActive = true` por defecto
- ✅ No se pierden datos
- ✅ No se resetea la base de datos
- ✅ El campo se agrega de forma segura con `IF NOT EXISTS`


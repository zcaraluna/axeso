# Paso 1: Migración de Base de Datos

Este es el primer paso para implementar OpenVPN. Crea las tablas necesarias en PostgreSQL.

## ✅ Pre-requisitos

- PostgreSQL corriendo y accesible
- Archivo `.env` configurado con `DATABASE_URL`
- Node.js y npm instalados

## 🚀 Ejecutar Migración

### Opción A: Desarrollo (Recomendado para pruebas)

```bash
npx prisma migrate dev --name add_vpn_tables
```

Este comando:
- ✅ Crea las nuevas tablas `vpn_certificates` y `vpn_connections`
- ✅ Actualiza el cliente de Prisma
- ✅ Crea un archivo de migración que puedes revisar

### Opción B: Producción (Si ya estás en producción)

```bash
npx prisma migrate deploy
```

## 📋 Verificar que Funcionó

Después de ejecutar la migración, deberías ver:

1. **Mensaje de éxito** en la terminal
2. **Nuevo archivo de migración** en `prisma/migrations/`
3. **Tablas creadas** en PostgreSQL

### Verificar en PostgreSQL

```bash
# Conectarse a PostgreSQL
sudo -u postgres psql controldeacceso

# Ver las nuevas tablas
\dt vpn*

# Deberías ver:
# - vpn_certificates
# - vpn_connections

# Salir
\q
```

## ⚠️ Si Hay Errores

### Error: "Database connection failed"
- Verifica que PostgreSQL esté corriendo: `sudo systemctl status postgresql`
- Verifica `DATABASE_URL` en tu archivo `.env`
- Verifica credenciales de acceso

### Error: "Migration failed"
- Revisa los logs de error
- Verifica que no haya conflictos con migraciones anteriores
- Si es necesario, puedes hacer rollback: `npx prisma migrate reset` (⚠️ esto borra datos)

## ✅ Siguiente Paso

Una vez completada la migración, continúa con:

**Paso 2**: Configurar variables de entorno (ver `GUIA_RAPIDA_IMPLEMENTACION.md`)

O ejecuta directamente:
```bash
# Generar cliente Prisma actualizado
npx prisma generate
```

## 📝 Notas

- Esta migración es **segura** y no afecta datos existentes
- Solo agrega nuevas tablas
- Puedes ejecutarla en cualquier momento sin riesgo


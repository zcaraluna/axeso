# Scripts de Población de Datos

⚠️ **ADVERTENCIA IMPORTANTE**: Estos scripts están diseñados SOLO para desarrollo y pruebas. NUNCA ejecutar en producción.

## Scripts Disponibles

### 1. `seed.ts`
- **Propósito**: Crear usuarios por defecto
- **Seguro para producción**: ✅ Sí
- **Uso**: `npx tsx scripts/seed.ts`

### 2. `populate-visits.ts`
- **Propósito**: Poblar base de datos con visitas de prueba
- **Seguro para producción**: ❌ NO
- **Uso**: `ALLOW_DATA_POPULATION=true npx tsx scripts/populate-visits.ts`

### 3. `update-exits.ts`
- **Propósito**: Agregar registros de salida a visitas existentes
- **Seguro para producción**: ❌ NO
- **Uso**: `ALLOW_DATA_POPULATION=true npx tsx scripts/update-exits.ts`

## Protecciones de Seguridad

### Verificaciones Automáticas:
1. **NODE_ENV**: Si está en 'production', el script se detiene
2. **ALLOW_DATA_POPULATION**: Debe estar configurado como 'true'
3. **Advertencias**: Mensajes claros sobre el uso del script

### Variables de Entorno Requeridas:
```bash
# Para scripts de población de datos
ALLOW_DATA_POPULATION=true

# Para evitar ejecución en producción
NODE_ENV=development
```

## Uso Seguro

### En Desarrollo Local:
```bash
# 1. Crear usuarios
npx tsx scripts/seed.ts

# 2. Poblar visitas (solo si ALLOW_DATA_POPULATION=true)
ALLOW_DATA_POPULATION=true npx tsx scripts/populate-visits.ts

# 3. Agregar salidas (solo si ALLOW_DATA_POPULATION=true)
ALLOW_DATA_POPULATION=true npx tsx scripts/update-exits.ts
```

### En Producción:
- ❌ **NUNCA** ejecutar scripts de población
- ✅ Solo ejecutar `seed.ts` si es necesario crear usuarios
- ✅ La base de datos debe permanecer limpia para datos reales

## Configuración del Servidor

### Variables de Entorno en Producción:
```bash
NODE_ENV=production
# NO configurar ALLOW_DATA_POPULATION en producción
```

### Variables de Entorno en Desarrollo:
```bash
NODE_ENV=development
ALLOW_DATA_POPULATION=true
```

## Prevención de Accidentes

1. **Scripts protegidos**: No se ejecutan sin las variables correctas
2. **Verificación de entorno**: Bloqueo automático en producción
3. **Mensajes claros**: Advertencias y errores descriptivos
4. **Documentación**: Instrucciones claras de uso

## Datos Generados

- **Período**: 1 enero 2025 - 23 octubre 2025
- **Cantidad**: ~3,334 visitas
- **Motivos**: Todos los motivos disponibles en el sistema
- **Tiempos**: Entre 1-2 horas de estadía
- **Días**: Solo días laborales (lunes a viernes)

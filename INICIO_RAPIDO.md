# Inicio Rápido - Sistema de Control de Acceso

## Instalación en 3 Pasos

### 1. Instalar Dependencias
```bash
npm install
```

### 2. Iniciar Servidor de Desarrollo
```bash
npm run dev
```

### 3. Abrir en el Navegador
Visitar: http://localhost:3000

## Primer Uso

### Inicio de Sesión
Usar uno de estos usuarios de prueba:

- **Usuario**: `admin` | **Contraseña**: `admin123`
- **Usuario**: `oficial` | **Contraseña**: `oficial123`

### Registrar Primera Visita

1. Hacer clic en "Registrar Entrada"
2. **Permitir acceso a la cámara** cuando el navegador lo solicite
3. Completar el formulario:
   - Nombres: Juan
   - Apellidos: Pérez
   - Cédula: 1234567
   - Fecha de Nacimiento: Seleccionar del calendario
   - Teléfono: 0981234567
   - Motivo: Seleccionar "Consulta"
   - Descripción: "Consulta sobre expediente"
4. **Tomar fotografía**: 
   - Cambiar cámara si es necesario (aparece selector si hay varias)
   - Hacer clic en "Tomar Fotografía"
5. Hacer clic en "Registrar Entrada"
6. **Anotar el ID generado** (ejemplo: ASU181025-001)

### Registrar Salida

1. Hacer clic en "Registrar Salida"
2. Ingresar el ID anotado anteriormente
3. Hacer clic en "Buscar"
4. Verificar los datos
5. Hacer clic en "Registrar Salida"

### Ver Historial

1. Hacer clic en "Historial de Visitas"
2. Ver todas las visitas registradas
3. Usar los filtros si es necesario

## Navegación Rápida

| Página | URL | Descripción |
|--------|-----|-------------|
| Login | `/` | Iniciar sesión |
| Dashboard | `/dashboard` | Panel principal |
| Registro Entrada | `/registro-entrada` | Registrar visitante |
| Registro Salida | `/registro-salida` | Registrar salida |
| Historial | `/historial` | Ver todas las visitas |
| Usuarios | `/usuarios` | Gestión de usuarios |
| Exportar | `/exportar` | Exportar/importar datos |
| Estadísticas | `/estadisticas` | Ver análisis |

## Atajos de Teclado

- `Enter` en formularios: Enviar
- `Esc` (en desarrollo futuro): Cancelar

## Preguntas Frecuentes

### ¿Dónde se guardan los datos?
Los datos (incluyendo fotografías) se guardan en el LocalStorage del navegador. No se pierden al cerrar el navegador, pero sí al limpiar el caché.

### ¿Necesito cámara web?
Sí, es obligatorio tener una cámara web funcional para registrar visitas. El sistema la detectará automáticamente.

### ¿Puedo usar múltiples cámaras?
Sí, el sistema detecta todas las cámaras disponibles. Si tienes más de una, aparecerá un selector para elegir cuál usar.

### ¿Cómo agrego más usuarios?
Dashboard → Gestión de Usuarios → Completar formulario → Agregar Usuario

### ¿Cómo exporto los datos?
Dashboard → Exportar/Importar Datos → Elegir formato (CSV o JSON) → Descargar

### ¿Puedo usar esto en producción?
Este sistema está diseñado para desarrollo. Para producción, ver `SEGURIDAD.md` y `DESPLIEGUE.md`.

### ¿Funciona sin internet?
Sí, una vez cargada la página inicial, funciona completamente offline.

## Solución de Problemas

### El servidor no inicia
```bash
# Eliminar node_modules y reinstalar
rm -rf node_modules
npm install
npm run dev
```

### Los datos desaparecieron
Probablemente se limpió el caché del navegador. Usar la función de exportar regularmente para backup.

### No puedo iniciar sesión
Los usuarios por defecto se crean automáticamente al cargar la página por primera vez. Verificar en la consola del navegador (F12) si hay errores.

## Próximos Pasos

1. ✅ Familiarizarse con todas las páginas
2. ✅ Registrar varias visitas de prueba
3. ✅ Probar los filtros en el historial
4. ✅ Ver las estadísticas
5. ✅ Exportar datos de prueba
6. 📖 Leer `MANUAL_USUARIO.md` para más detalles
7. 🔒 Leer `SEGURIDAD.md` antes de producción
8. 🚀 Leer `DESPLIEGUE.md` para poner en producción

## Soporte

Para más información, consultar:
- `README.md` - Información general
- `MANUAL_USUARIO.md` - Manual de usuario detallado
- `CARACTERISTICAS.md` - Lista completa de funcionalidades
- `SEGURIDAD.md` - Recomendaciones de seguridad
- `DESPLIEGUE.md` - Guía de despliegue


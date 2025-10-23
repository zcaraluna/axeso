# Características del Sistema de Control de Acceso

## Funcionalidades Principales

### 1. Autenticación de Personal
- Sistema de login para personal de guardia
- Usuarios predeterminados para pruebas
- Gestión completa de usuarios (agregar/eliminar)
- Sesión persistente hasta cierre manual

### 2. Registro de Entrada
**Captura de Fotografía:**
- Detección automática de todas las cámaras disponibles
- Selector de cámara (si hay múltiples cámaras)
- Cambio de cámara en tiempo real
- Preview en vivo de la cámara
- Botón de captura instantánea
- Opción de retomar foto si no salió bien
- Validación obligatoria de foto antes de registrar
- Almacenamiento en formato JPEG comprimido (base64)

**Campos del Formulario:**
- Nombres del visitante
- Apellidos del visitante
- Número de cédula de identidad
- Fecha de nacimiento (con cálculo automático de edad)
- Número de teléfono
- Motivo de visita (selección de categoría)
- Descripción detallada del motivo

**Características:**
- Generación automática de identificador único (DDMM###ASU)
- Registro automático de fecha y hora de entrada
- Validación de todos los campos
- Confirmación visual del registro exitoso
- Formulario limpio tras cada registro
- Reinicio automático de cámara para próximo visitante

**Categorías de Motivos:**
- Declaración
- Consulta
- Entrega de Documentos
- Citación
- Denuncia
- Otro

### 3. Registro de Salida
**Funcionalidad:**
- Búsqueda por identificador único
- Visualización de datos completos del visitante
- Fotografía del visitante para verificación visual
- Validación de salida única (no duplicar)
- Registro automático de fecha y hora de salida
- Confirmación visual del registro

**Información Mostrada:**
- Fotografía del visitante (grande, centrada)
- Identificador
- Nombre completo
- Cédula
- Edad
- Teléfono
- Fecha y hora de entrada
- Motivo de visita

### 4. Historial de Visitas
**Capacidades:**
- Visualización de todas las visitas en tabla
- Miniaturas de fotografías en cada fila
- Búsqueda por: ID, nombre, apellido o cédula
- Filtros:
  - Todas las visitas
  - Solo personas dentro
  - Solo salidas registradas
- Modal de detalles con foto ampliada
- Contador de resultados
- Ordenamiento por más reciente

**Columnas de la Tabla:**
- Fotografía (miniatura 48x48px)
- ID único
- Nombre completo
- Cédula
- Fecha y hora de entrada
- Fecha y hora de salida
- Motivo
- Estado (Dentro/Salió)
- Acciones (ver detalles)

**Modal de Detalles:**
- Fotografía ampliada (256x256px)
- Todos los datos del visitante
- Información de registro
- Botón de cierre

### 5. Gestión de Usuarios
**Funcionalidades:**
- Agregar nuevos usuarios al sistema
- Eliminar usuarios existentes
- Validación de contraseñas (mínimo 6 caracteres)
- Protección contra eliminación del último usuario
- Protección contra auto-eliminación
- Visualización de todos los usuarios

**Validaciones:**
- Prevención de usuarios duplicados
- Longitud mínima de contraseña
- Campos obligatorios

### 6. Exportar/Importar Datos
**Exportación:**
- Formato CSV (compatible con Excel)
- Formato JSON (para backup/restauración)
- Nombre de archivo con fecha automática
- Incluye todos los campos

**Importación:**
- Importar desde archivo JSON
- Advertencia de sobrescritura
- Validación de formato

**Casos de Uso:**
- Backup de datos
- Migración de datos
- Análisis en Excel
- Reportes

### 7. Estadísticas y Análisis
**Métricas Principales:**
- Total de visitas registradas
- Personas actualmente dentro
- Total de salidas registradas
- Tiempo promedio de estadía

**Análisis Detallado:**
- Distribución de visitas por motivo
- Gráficos de barras interactivos
- Usuario más activo
- Hora pico de visitas
- Visitas por día
- Histórico de últimos 10 días

**Visualización:**
- Cards con gradientes de colores
- Gráficos de barras proporcionales
- Datos actualizados en tiempo real

### 8. Dashboard Principal
**Información Mostrada:**
- Estadísticas rápidas (3 métricas principales)
- Acceso rápido a todas las funciones
- Identificación del usuario actual
- Diseño intuitivo con cards

**Accesos Directos:**
- Registrar Entrada
- Registrar Salida
- Historial de Visitas
- Gestión de Usuarios
- Exportar/Importar
- Estadísticas

## Características Técnicas

### Diseño
- Interfaz moderna y minimalista
- Diseño responsive (móvil, tablet, desktop)
- Gradientes y sombras suaves
- Efectos hover interactivos
- Paleta de colores profesional

### Experiencia de Usuario
- Navegación intuitiva
- Mensajes de confirmación claros
- Validación de formularios en tiempo real
- Mensajes de error descriptivos
- Carga rápida de páginas
- Sin necesidad de recargar manualmente

### Persistencia de Datos
- LocalStorage del navegador
- Datos persistentes entre sesiones
- Actualización automática
- Sin necesidad de servidor (para desarrollo)

### Seguridad Básica
- Autenticación requerida
- Protección de rutas
- Validación de inputs
- Prevención de duplicados

## Formato de Identificador Único

**Estructura: ASUDDMMYY-XXX**

Componentes:
- **ASU**: Prefijo fijo "Asunción"
- **DD**: Día del mes (01-31)
- **MM**: Mes (01-12)
- **YY**: Año (últimos 2 dígitos)
- **XXX**: Número secuencial del día (001-999)

Ventajas:
- Fácil de leer y comunicar
- Identifica fecha completa de visita (incluye año)
- Único por día y año
- Se reinicia diariamente
- No se duplica entre años

Ejemplos:
- `ASU181025-001` - Primera visita del 18 de octubre 2025
- `ASU181025-042` - Visita número 42 del 18 de octubre 2025
- `ASU181026-001` - Primera visita del 18 de octubre 2026

## Flujo de Trabajo Típico

1. **Personal llega a su turno**
   - Inicia sesión con sus credenciales

2. **Llega un visitante**
   - Registrar entrada con todos los datos
   - Entregar/anotar el ID único generado

3. **Visitante sale**
   - Solicitar ID único
   - Buscar y registrar salida

4. **Fin de turno**
   - Revisar historial si es necesario
   - Cerrar sesión

5. **Revisión periódica**
   - Ver estadísticas
   - Exportar datos para reportes
   - Revisar personas que no registraron salida

## Beneficios del Sistema

### Para el Personal de Guardia
- Registro rápido y eficiente
- Menos papeleo manual
- Búsqueda instantánea
- Datos organizados

### Para la Administración
- Estadísticas en tiempo real
- Reportes exportables
- Auditoría completa
- Control de acceso mejorado

### Para la Institución
- Mayor seguridad
- Trazabilidad completa
- Datos estructurados
- Mejora en procesos

## Próximas Mejoras Posibles

- [ ] Impresión de credencial temporal con QR
- [ ] Notificaciones para visitas prolongadas
- [ ] Fotografía del visitante
- [ ] Firma digital
- [ ] Integración con sistema de citas
- [ ] App móvil para registro remoto
- [ ] Dashboard de supervisión en tiempo real
- [ ] Reportes automáticos programados
- [ ] Integración con control de acceso físico
- [ ] Sistema de alertas y notificaciones


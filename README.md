# aXeso - Sistema de Control de Acceso

**aXeso** es un sistema moderno de control de acceso desarrollado para la Policía Nacional.

## 🎯 Características

- **Autenticación de Personal**: Sistema de login seguro con JWT
- **Registro de Entrada**: Formulario completo para registrar visitantes
- **Captura de Fotografía**: Soporte para cámara web (opcional)
- **Registro de Salida**: Sistema de búsqueda y registro de salida por identificador
- **Historial Completo**: Visualización de todas las visitas con múltiples filtros
- **Identificador Único**: Sistema automático de generación de IDs (formato ASUDDMMYY-XXX)
- **Cálculo Automático de Edad**: A partir de la fecha de nacimiento
- **Registro Automático de Fecha/Hora**: Timestamp automático de entrada y salida
- **Gestión de Usuarios**: Sistema completo de administración de usuarios con roles
- **Tickets Térmicos**: Generación de tickets de acceso para impresoras de 80mm
- **Estadísticas Detalladas**: Dashboard con métricas y análisis de visitas
- **Búsqueda Avanzada**: Múltiples filtros (estado, motivo, fecha, descripción)

## 📋 Requisitos del Sistema

- Node.js 18+ 
- PostgreSQL 12+
- npm o yarn
- Navegador moderno (Chrome, Firefox, Edge, Safari)
- **Opcional**: Cámara web para fotografías de visitantes

## 🚀 Instalación

1. Clonar el repositorio e instalar dependencias:
```bash
npm install
```

2. Configurar variables de entorno (`.env`):
```env
DATABASE_URL="postgresql://postgres:admin123@localhost:5432/controldeacceso"
JWT_SECRET="tu-secreto-jwt-super-seguro-aqui"
```

3. Configurar la base de datos:
```bash
npx prisma generate
npx prisma db push
npx tsx scripts/seed.ts
```

4. Iniciar servidor de desarrollo:
```bash
npm run dev
```

5. Abrir navegador en `http://localhost:3000`

## 👥 Usuarios de Prueba

- **Admin**: admin / admin123
- **Usuario**: oficial / oficial123

> **Nota**: Se requiere cambio de contraseña en el primer inicio de sesión

## 📊 Estructura de Datos

### Visitante
- Nombres (MAYÚSCULAS)
- Apellidos (MAYÚSCULAS)
- Número de Cédula
- Fecha de Nacimiento
- Edad (calculada automáticamente)
- Número de Teléfono
- Fotografía (opcional, capturada con cámara web)
- Fecha/Hora de Entrada (automática)
- Motivo de Visita (categoría + descripción)
- Identificador Único (formato: ASUDDMMYY-XXX)
- Fecha/Hora de Salida (cuando aplique)
- Registrado por (nombre completo del usuario)

### Usuario
- Usuario (único)
- Contraseña (encriptada con bcrypt)
- Nombres
- Apellidos
- Cédula (único)
- Credencial
- Número de Teléfono
- Grado (jerarquía policial)
- Rol (user/admin)

## 🏷️ Motivos de Visita

- Consulta
- Entrega de Documentos
- Citación
- Denuncia
- Visita a Director
- Otro

## 🔧 Tecnologías Utilizadas

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Prisma ORM
- **Base de Datos**: PostgreSQL
- **Autenticación**: JWT + bcrypt
- **Estado Global**: React Context API

## 🏗️ Producción

Para compilar para producción:

```bash
npm run build
npm start
```

## 📱 Páginas Disponibles

- `/` - Login del personal
- `/dashboard` - Panel principal con estadísticas
- `/registro-entrada` - Registro de entrada de visitantes
- `/registro-salida` - Registro de salida de visitantes  
- `/historial` - Historial completo de visitas
- `/usuarios` - Gestión de usuarios (solo admin)
- `/exportar` - Búsqueda y exportación de datos
- `/estadisticas` - Análisis y estadísticas detalladas
- `/resumen-registro` - Resumen post-registro con ticket
- `/cambiar-password` - Cambio de contraseña obligatorio

## 🔐 Seguridad

- Contraseñas encriptadas con bcrypt (12 rounds)
- Autenticación basada en JWT
- Cambio de contraseña obligatorio en primer login
- Control de acceso basado en roles (user/admin)
- Validación de datos en frontend y backend
- Protección contra inyección SQL (Prisma ORM)

## 📝 Formato de Identificador

**Formato**: `ASUDDMMYY-XXX`

- `ASU` = Identificador fijo "Asunción"
- `DD` = Día (2 dígitos)
- `MM` = Mes (2 dígitos)
- `YY` = Año (2 dígitos)
- `XXX` = Número secuencial del día (001-999)

**Ejemplos**:
- Primera visita del 18 de octubre 2025: `ASU181025-001`
- Segunda visita del 18 de octubre 2025: `ASU181025-002`
- Primera visita del 18 de octubre 2026: `ASU181026-001`

## 🎨 Características del Dashboard

### Tarjetas de Estadísticas
- **Visitas de Hoy**: Contador de visitas del día actual (azul)
- **Dentro de la Dirección**: Visitantes actualmente dentro (verde)
- **Salidas Registradas**: Total de salidas procesadas (rojo)

### Acciones Principales
- **Registrar Entrada**: Formulario de registro completo (verde)
- **Registrar Salida**: Búsqueda y cierre de visitas (rojo)

### Funciones Secundarias
- **Historial de Visitas**: Búsqueda avanzada con filtros (púrpura)
- **Estadísticas**: Análisis detallado de visitas (azul)
- **Gestión de Usuarios**: Admin de usuarios (naranja, solo admin)

## 🖨️ Tickets Térmicos

- Formato de 80mm para impresoras térmicas
- Incluye: ID, nombre, documento, fecha/hora, motivo
- Vista previa antes de imprimir
- Optimizado para impresión sin márgenes

## 📈 Filtros Disponibles en Historial

1. **Estado**: Todas / Dentro / Salidas
2. **Búsqueda general**: ID, nombre, apellido, cédula
3. **Descripción**: Buscar en descripción del motivo
4. **Motivo de visita**: Filtrar por categoría específica
5. **Rango de fechas**: Desde/hasta
6. **Paginación**: 15 registros por página

## ⚙️ Jerarquías Policiales

1. COMISARIO GENERAL
2. COMISARIO PRINCIPAL
3. COMISARIO
4. SUBCOMISARIO
5. OFICIAL INSPECTOR
6. OFICIAL PRIMERO
7. OFICIAL SEGUNDO
8. OFICIAL AYUDANTE
9. SUBOFICIAL SUPERIOR
10. SUBOFICIAL PRINCIPAL
11. SUBOFICIAL MAYOR
12. SUBOFICIAL INSPECTOR
13. SUBOFICIAL PRIMERO
14. SUBOFICIAL SEGUNDO
15. SUBOFICIAL AYUDANTE
16. FUNCIONARIO/A

## 📌 Notas Importantes

- Los datos se almacenan en PostgreSQL
- Las fotografías se guardan en formato base64 en la base de datos
- El sistema está optimizado para uso institucional
- Se recomienda backup periódico de la base de datos
- Las fotografías son datos biométricos sensibles - manejar con cuidado
- Cada usuario solo debe acceder con sus credenciales
- Los registros históricos son compartidos entre todos los usuarios

## 🔄 Migración desde localStorage

Si estás migrando desde una versión anterior que usaba localStorage:

1. El sistema ahora usa PostgreSQL
2. Los datos antiguos no se migran automáticamente
3. Se recomienda exportar a CSV antes de migrar

## 📄 Licencia

Sistema desarrollado para uso exclusivo de la Policía Nacional.

---

**aXeso** - Control de Acceso Inteligente 🔐

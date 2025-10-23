# Manual de Usuario - Sistema de Control de Acceso

## Inicio de Sesión

1. Abrir la aplicación en el navegador
2. Ingresar usuario y contraseña del personal de guardia
3. Hacer clic en "Iniciar Sesión"

## Dashboard Principal

El dashboard muestra:
- Total de visitas registradas
- Personas actualmente dentro de la institución
- Total de salidas registradas

Desde aquí puede acceder a:
- Registrar Entrada
- Registrar Salida
- Historial de Visitas

## Registrar Entrada de Visitante

1. Hacer clic en "Registrar Entrada"
2. Completar el formulario:
   - **Nombres**: Nombre(s) del visitante
   - **Apellidos**: Apellido(s) del visitante
   - **Número de Cédula**: CI sin puntos ni guiones
   - **Fecha de Nacimiento**: Seleccionar del calendario (la edad se calcula automáticamente)
   - **Número de Teléfono**: Teléfono de contacto
   - **Motivo de Visita**: Seleccionar de la lista
   - **Descripción del Motivo**: Detallar el motivo específico de la visita
3. **Tomar fotografía del visitante**:
   - La cámara se iniciará automáticamente
   - Si hay varias cámaras disponibles, seleccionar la deseada del menú desplegable
   - Posicionar al visitante frente a la cámara
   - Hacer clic en "Tomar Fotografía"
   - Si la foto no salió bien, hacer clic en "Tomar Otra Foto"
4. Hacer clic en "Registrar Entrada"
5. Se mostrará el **Identificador Único** generado (ejemplo: ASU181025-001)
6. **IMPORTANTE**: Anotar o entregar este identificador al visitante

## Registrar Salida de Visitante

1. Hacer clic en "Registrar Salida"
2. Solicitar al visitante su identificador
3. Ingresar el identificador en el campo de búsqueda
4. Hacer clic en "Buscar"
5. Se mostrará la información del visitante, incluyendo su fotografía
6. Verificar visualmente que la persona corresponda con la foto
7. Hacer clic en "Registrar Salida"

## Historial de Visitas

1. Hacer clic en "Historial de Visitas"
2. La tabla mostrará una miniatura de la foto de cada visitante
3. Opciones disponibles:
   - **Buscar**: Por ID, nombre, apellido o cédula
   - **Filtrar**:
     - Todas: Muestra todas las visitas
     - Dentro: Solo personas que no han salido
     - Salidas: Solo visitas con salida registrada
   - **Ver detalles**: Hacer clic para ver información completa con foto ampliada

## Formato de Identificador

El identificador único tiene el formato: **ASUDDMMYY-XXX**

Donde:
- **ASU**: Prefijo fijo "Asunción"
- **DD**: Día del mes (01-31)
- **MM**: Mes (01-12)
- **YY**: Año (últimos 2 dígitos)
- **XXX**: Número secuencial del día (001-999)

Ejemplos:
- ASU181025-001: Primera visita del 18 de octubre de 2025
- ASU181025-002: Segunda visita del 18 de octubre de 2025
- ASU191025-001: Primera visita del 19 de octubre de 2025
- ASU181026-001: Primera visita del 18 de octubre de 2026

## Cerrar Sesión

Hacer clic en "Cerrar Sesión" en la parte superior derecha de cualquier página.

## Notas Importantes

- La cámara se activa automáticamente al entrar en Registro de Entrada
- Es obligatorio tomar una fotografía antes de registrar la visita
- La fecha y hora de entrada se registra automáticamente
- La fecha y hora de salida se registra automáticamente al confirmar la salida
- No se puede registrar la salida dos veces para el mismo visitante
- Todos los campos marcados con (*) son obligatorios
- Las fotografías se guardan en formato JPEG comprimido
- Los datos se guardan localmente en el navegador

## Permisos de Cámara

Al acceder por primera vez a "Registro de Entrada", el navegador solicitará permiso para usar la cámara:
1. Hacer clic en "Permitir" cuando el navegador lo solicite
2. Si se denegó por error, actualizar la página y volver a permitir
3. En Chrome/Edge: Hacer clic en el candado/cámara en la barra de direcciones para gestionar permisos

## Cambiar de Cámara

Si el dispositivo tiene múltiples cámaras (webcam integrada, externa, etc.):
1. El sistema detectará automáticamente todas las cámaras disponibles
2. Aparecerá un menú desplegable "Seleccionar Cámara" en la sección de fotografía
3. Seleccionar la cámara deseada de la lista
4. El video cambiará automáticamente a la cámara seleccionada
5. El selector solo aparece si hay 2 o más cámaras disponibles


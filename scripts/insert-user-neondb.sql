-- Script para insertar manualmente los datos de JESUS ANDRES SANCHEZ CACERES en NeonDB
-- IMPORTANTE: Reemplaza los valores entre < > con los datos reales obtenidos del VPS

-- ============================================================================
-- PASO 1: Ejecuta scripts/query-user-vps.sql en el VPS para obtener los datos
-- ============================================================================

-- ============================================================================
-- PASO 2: Si es una VISITA (tabla visits) - MÁS PROBABLE
-- ============================================================================
-- Copia y pega el siguiente INSERT, reemplazando los valores < > con los datos del VPS

INSERT INTO public.visits (
    id,
    nombres,
    apellidos,
    cedula,
    telefono,
    "entryDate",
    "entryTime",
    "motivoCategoria",
    "motivoDescripcion",
    photo,
    "exitDate",
    "exitTime",
    "registeredBy",
    "createdAt",
    "updatedAt",
    "userId",
    "exitRegisteredBy",
    "tipoDocumento"
) VALUES (
    '<id_de_visita>',                      -- Ejemplo: 'ASU070126-001' o 'cmixxxxxx0000iaxxxxx'
    'JESUS ANDRES',                       -- Copiar exacto del VPS
    'SANCHEZ CACERES',                    -- Copiar exacto del VPS
    '<cedula>',                           -- Ejemplo: '1234567'
    '<telefono>',                         -- Ejemplo: '0981234567'
    '<entryDate>',                        -- Ejemplo: '07/01/2026' (formato DD/MM/YYYY)
    '<entryTime>',                        -- Ejemplo: '02:30' (formato HH:MM)
    '<motivoCategoria>',                  -- Ejemplo: 'Consulta', 'Denuncia', etc.
    '<motivoDescripcion>',                -- Descripción completa del motivo
    '<photo>',                            -- NULL o la foto en base64/texto si existe
    '<exitDate>',                         -- NULL o la fecha de salida si ya salió (formato DD/MM/YYYY)
    '<exitTime>',                         -- NULL o la hora de salida si ya salió (formato HH:MM)
    '<registeredBy>',                     -- Nombre del usuario que registró (ejemplo: 'GUILLERMO RECALDE')
    '<createdAt>',                        -- Ejemplo: '2026-01-07 02:30:00.000' (formato timestamp)
    '<updatedAt>',                        -- Ejemplo: '2026-01-07 02:30:00.000' (formato timestamp)
    '<userId>',                           -- ID del usuario que registró (debe existir en users)
    '<exitRegisteredBy>',                 -- NULL o el nombre del usuario que registró la salida
    '<tipoDocumento>'                     -- Ejemplo: 'Cédula de Identidad', 'Pasaporte', etc.
);

-- ============================================================================
-- PASO 3: Si es un USUARIO del sistema (tabla users) - MENOS PROBABLE
-- ============================================================================
-- Solo si la consulta en el VPS muestra que es un usuario del sistema

-- INSERT INTO public.users (
--     id,
--     username,
--     password,
--     "createdAt",
--     "updatedAt",
--     apellidos,
--     cedula,
--     credencial,
--     grado,
--     nombres,
--     role,
--     telefono,
--     "mustChangePassword",
--     "isActive"
-- ) VALUES (
--     '<id_del_usuario>',                 -- Ejemplo: 'cmixxxxxx0000iaxxxxx'
--     '<username>',                       -- Ejemplo: 'sanchezje'
--     '<password_hash>',                   -- El hash bcrypt completo (ejemplo: '$2b$12$...')
--     '<createdAt>',                      -- Ejemplo: '2026-01-07 02:30:00.000'
--     '<updatedAt>',                       -- Ejemplo: '2026-01-07 02:30:00.000'
--     'SANCHEZ CACERES',
--     '<cedula>',                         -- Ejemplo: '1234567'
--     '<credencial>',                     -- Ejemplo: '12345'
--     '<grado>',                          -- Ejemplo: 'OFICIAL INSPECTOR'
--     'JESUS ANDRES',
--     'user',                             -- o 'admin'
--     '<telefono>',                       -- Ejemplo: '0981234567'
--     true,                               -- o false
--     true                                -- o false
-- );

-- ============================================================================
-- NOTAS IMPORTANTES:
-- ============================================================================
-- 1. El campo "userId" en visits DEBE existir en la tabla users de NeonDB
-- 2. Si no conoces el userId, puedes buscarlo con:
--    SELECT id, nombres, apellidos FROM public.users WHERE nombres ILIKE '%<nombre>%';
-- 3. Las fechas en "entryDate" y "exitDate" son texto en formato DD/MM/YYYY
-- 4. Las horas en "entryTime" y "exitTime" son texto en formato HH:MM
-- 5. Los timestamps "createdAt" y "updatedAt" son en formato: 'YYYY-MM-DD HH:MM:SS.mmm'
-- 6. Si algún campo es NULL en el VPS, usa NULL (sin comillas) en el INSERT


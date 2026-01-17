-- Script para consultar los datos de JESUS ANDRES SANCHEZ CACERES en el VPS
-- Ejecutar en el VPS (conectado a la base de datos controldeacceso)
-- Conectarse: psql -U postgres -d controldeacceso

-- 1. Buscar en la tabla visits (más probable que sea una visita reciente)
-- Buscar por nombre completo
SELECT 
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
FROM public.visits
WHERE (nombres ILIKE '%JESUS%' AND nombres ILIKE '%ANDRES%')
   AND (apellidos ILIKE '%SANCHEZ%' AND apellidos ILIKE '%CACERES%')
ORDER BY "createdAt" DESC
LIMIT 5;

-- 2. Si no se encuentra, buscar por partes del nombre
SELECT 
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
FROM public.visits
WHERE nombres ILIKE '%JESUS%' 
   AND apellidos ILIKE '%SANCHEZ%'
ORDER BY "createdAt" DESC
LIMIT 10;

-- 3. Buscar visitas creadas después del backup (probablemente después de 2026-01-07 02:15)
SELECT 
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
FROM public.visits
WHERE "createdAt" > '2026-01-07 02:15:00'
ORDER BY "createdAt" DESC;

-- 4. Verificar si es un usuario del sistema (menos probable)
SELECT 
    id,
    username,
    password,
    "createdAt",
    "updatedAt",
    apellidos,
    cedula,
    credencial,
    grado,
    nombres,
    role,
    telefono,
    "mustChangePassword",
    "isActive"
FROM public.users
WHERE nombres ILIKE '%JESUS%' 
   AND nombres ILIKE '%ANDRES%'
   AND apellidos ILIKE '%SANCHEZ%'
   AND apellidos ILIKE '%CACERES%';


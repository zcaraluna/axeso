-- Script para limpiar la base de datos NeonDB antes de importar el backup
-- Ejecutar en el SQL Editor de NeonDB

-- Eliminar todas las tablas en orden (respetando foreign keys)
DROP TABLE IF EXISTS public.dispositivos_autorizados CASCADE;
DROP TABLE IF EXISTS public.codigos_activacion CASCADE;
DROP TABLE IF EXISTS public.visits CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;
DROP TABLE IF EXISTS public._prisma_migrations CASCADE;

-- Limpiar el schema public completamente
DROP SCHEMA IF EXISTS public CASCADE;

-- Recrear el schema public
-- NeonDB maneja los permisos automáticamente
CREATE SCHEMA public;

-- Verificar que está limpio
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public';
-- Debería retornar 0 filas


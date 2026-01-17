-- Script para verificar que todos los datos se hayan insertado correctamente en NeonDB
-- Ejecutar en el SQL Editor de NeonDB después de importar los datos

-- Conteos esperados (basados en backup_neondb_inserts.sql):
-- _prisma_migrations: 9 registros
-- codigos_activacion: 7 registros
-- dispositivos_autorizados: 6 registros
-- users: 67 registros
-- visits: 599 registros
-- vpn_certificates: 2 registros
-- vpn_connections: 5 registros
-- TOTAL: 695 registros

-- Verificación de conteos por tabla
SELECT 
    '_prisma_migrations' as tabla,
    COUNT(*) as encontrados,
    9 as esperados,
    CASE WHEN COUNT(*) = 9 THEN '✅ OK' ELSE '❌ ERROR - Faltan ' || (9 - COUNT(*))::text || ' registros' END as estado
FROM public._prisma_migrations
UNION ALL
SELECT 
    'codigos_activacion',
    COUNT(*),
    7,
    CASE WHEN COUNT(*) = 7 THEN '✅ OK' ELSE '❌ ERROR - Faltan ' || (7 - COUNT(*))::text || ' registros' END
FROM public.codigos_activacion
UNION ALL
SELECT 
    'dispositivos_autorizados',
    COUNT(*),
    6,
    CASE WHEN COUNT(*) = 6 THEN '✅ OK' ELSE '❌ ERROR - Faltan ' || (6 - COUNT(*))::text || ' registros' END
FROM public.dispositivos_autorizados
UNION ALL
SELECT 
    'users',
    COUNT(*),
    67,
    CASE WHEN COUNT(*) = 67 THEN '✅ OK' ELSE '❌ ERROR - Faltan ' || (67 - COUNT(*))::text || ' registros' END
FROM public.users
UNION ALL
SELECT 
    'visits',
    COUNT(*),
    599,
    CASE WHEN COUNT(*) = 599 THEN '✅ OK' ELSE '❌ ERROR - Faltan ' || (599 - COUNT(*))::text || ' registros' END
FROM public.visits
UNION ALL
SELECT 
    'vpn_certificates',
    COUNT(*),
    2,
    CASE WHEN COUNT(*) = 2 THEN '✅ OK' ELSE '❌ ERROR - Faltan ' || (2 - COUNT(*))::text || ' registros' END
FROM public.vpn_certificates
UNION ALL
SELECT 
    'vpn_connections',
    COUNT(*),
    5,
    CASE WHEN COUNT(*) = 5 THEN '✅ OK' ELSE '❌ ERROR - Faltan ' || (5 - COUNT(*))::text || ' registros' END
FROM public.vpn_connections
ORDER BY tabla;

-- Resumen total
SELECT 
    'TOTAL' as resumen,
    (SELECT COUNT(*) FROM public._prisma_migrations) +
    (SELECT COUNT(*) FROM public.codigos_activacion) +
    (SELECT COUNT(*) FROM public.dispositivos_autorizados) +
    (SELECT COUNT(*) FROM public.users) +
    (SELECT COUNT(*) FROM public.visits) +
    (SELECT COUNT(*) FROM public.vpn_certificates) +
    (SELECT COUNT(*) FROM public.vpn_connections) as registros_encontrados,
    695 as registros_esperados,
    CASE 
        WHEN (SELECT COUNT(*) FROM public._prisma_migrations) +
             (SELECT COUNT(*) FROM public.codigos_activacion) +
             (SELECT COUNT(*) FROM public.dispositivos_autorizados) +
             (SELECT COUNT(*) FROM public.users) +
             (SELECT COUNT(*) FROM public.visits) +
             (SELECT COUNT(*) FROM public.vpn_certificates) +
             (SELECT COUNT(*) FROM public.vpn_connections) = 695 
        THEN '✅ MIGRACIÓN COMPLETA' 
        ELSE '❌ MIGRACIÓN INCOMPLETA' 
    END as estado_final;


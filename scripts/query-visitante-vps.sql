-- Consultar datos de JESUS ANDRES SANCHEZ CACERES en el VPS
-- Ejecutar: psql -U postgres -d controldeacceso

SELECT * 
FROM public.visits 
WHERE nombres ILIKE '%JESUS%ANDRES%' 
  AND apellidos ILIKE '%SANCHEZ%CACERES%'
ORDER BY "createdAt" DESC;



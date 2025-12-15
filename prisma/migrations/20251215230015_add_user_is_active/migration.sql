-- AlterTable
-- Agregar columna isActive si no existe (seguro para ejecutar múltiples veces)
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;

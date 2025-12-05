/*
  Warnings:

  - You are about to drop the column `edad` on the `visits` table. All the data in the column will be lost.
  - You are about to drop the column `fechaNacimiento` on the `visits` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "visits" DROP COLUMN "edad",
DROP COLUMN "fechaNacimiento",
ADD COLUMN     "tipoDocumento" TEXT NOT NULL DEFAULT 'Cédula de Identidad';

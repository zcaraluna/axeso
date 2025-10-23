-- AlterTable
ALTER TABLE "users" ADD COLUMN     "apellidos" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "cedula" TEXT,
ADD COLUMN     "credencial" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "grado" TEXT NOT NULL DEFAULT 'FUNCIONARIO/A',
ADD COLUMN     "nombres" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "role" TEXT NOT NULL DEFAULT 'user',
ADD COLUMN     "telefono" TEXT NOT NULL DEFAULT '';

-- CreateIndex
CREATE UNIQUE INDEX "users_cedula_key" ON "users"("cedula");




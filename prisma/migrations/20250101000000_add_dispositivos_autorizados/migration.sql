-- CreateTable
CREATE TABLE IF NOT EXISTS "codigos_activacion" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "usado" BOOLEAN NOT NULL DEFAULT false,
    "usadoEn" TIMESTAMP(3),
    "dispositivoFingerprint" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creadoPor" TEXT,
    "expiraEn" TIMESTAMP(3),
    "nombre" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "codigos_activacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "dispositivos_autorizados" (
    "id" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "codigoActivacionId" TEXT,
    "autorizadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ultimoAcceso" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "nombre" TEXT,

    CONSTRAINT "dispositivos_autorizados_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "codigos_activacion_codigo_key" ON "codigos_activacion"("codigo");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "codigos_activacion_codigo_idx" ON "codigos_activacion"("codigo");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "codigos_activacion_usado_idx" ON "codigos_activacion"("usado");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "codigos_activacion_activo_idx" ON "codigos_activacion"("activo");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "codigos_activacion_nombre_idx" ON "codigos_activacion"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "dispositivos_autorizados_fingerprint_key" ON "dispositivos_autorizados"("fingerprint");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "dispositivos_autorizados_fingerprint_idx" ON "dispositivos_autorizados"("fingerprint");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "dispositivos_autorizados_activo_idx" ON "dispositivos_autorizados"("activo");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "dispositivos_autorizados_ultimoAcceso_idx" ON "dispositivos_autorizados"("ultimoAcceso");

-- AddForeignKey
ALTER TABLE "codigos_activacion" ADD CONSTRAINT "codigos_activacion_creadoPor_fkey" FOREIGN KEY ("creadoPor") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispositivos_autorizados" ADD CONSTRAINT "dispositivos_autorizados_codigoActivacionId_fkey" FOREIGN KEY ("codigoActivacionId") REFERENCES "codigos_activacion"("id") ON DELETE SET NULL ON UPDATE CASCADE;


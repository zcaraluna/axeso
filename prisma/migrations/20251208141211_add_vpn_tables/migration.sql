-- AlterTable
ALTER TABLE "visits" ALTER COLUMN "tipoDocumento" DROP DEFAULT;

-- CreateTable
CREATE TABLE "vpn_certificates" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "certificateName" TEXT NOT NULL,
    "deviceName" TEXT NOT NULL,
    "location" TEXT,
    "commonName" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "revokedBy" TEXT,
    "lastUsedAt" TIMESTAMP(3),
    "ipAddress" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vpn_certificates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vpn_connections" (
    "id" TEXT NOT NULL,
    "certificateId" TEXT NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "realIpAddress" TEXT,
    "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "disconnectedAt" TIMESTAMP(3),
    "bytesReceived" BIGINT NOT NULL DEFAULT 0,
    "bytesSent" BIGINT NOT NULL DEFAULT 0,
    "duration" INTEGER,

    CONSTRAINT "vpn_connections_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "vpn_certificates_certificateName_key" ON "vpn_certificates"("certificateName");

-- AddForeignKey
ALTER TABLE "vpn_certificates" ADD CONSTRAINT "vpn_certificates_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vpn_connections" ADD CONSTRAINT "vpn_connections_certificateId_fkey" FOREIGN KEY ("certificateId") REFERENCES "vpn_certificates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

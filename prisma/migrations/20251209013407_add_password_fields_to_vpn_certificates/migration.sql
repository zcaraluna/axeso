-- AlterTable
ALTER TABLE "vpn_certificates" ADD COLUMN     "hasPassword" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "passwordHash" TEXT;

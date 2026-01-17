-- Script para crear las tablas VPN que faltan en NeonDB
-- Ejecutar en el SQL Editor de NeonDB

-- Crear tabla vpn_certificates
CREATE TABLE IF NOT EXISTS public.vpn_certificates (
    id text NOT NULL,
    "userId" text,
    "certificateName" text NOT NULL,
    "deviceName" text NOT NULL,
    location text,
    "commonName" text NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    "issuedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    "revokedAt" timestamp(3) without time zone,
    "revokedBy" text,
    "lastUsedAt" timestamp(3) without time zone,
    "ipAddress" text,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "hasPassword" boolean DEFAULT false NOT NULL,
    "passwordHash" text
);

-- Crear tabla vpn_connections
CREATE TABLE IF NOT EXISTS public.vpn_connections (
    id text NOT NULL,
    "certificateId" text NOT NULL,
    "ipAddress" text NOT NULL,
    "realIpAddress" text,
    "connectedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "disconnectedAt" timestamp(3) without time zone,
    "bytesReceived" bigint DEFAULT 0 NOT NULL,
    "bytesSent" bigint DEFAULT 0 NOT NULL,
    duration integer
);

-- Crear índices y constraints para vpn_certificates
ALTER TABLE ONLY public.vpn_certificates ADD CONSTRAINT "vpn_certificates_pkey" PRIMARY KEY (id);
CREATE UNIQUE INDEX IF NOT EXISTS "vpn_certificates_certificateName_key" ON public.vpn_certificates USING btree ("certificateName");

-- Crear índices y constraints para vpn_connections
ALTER TABLE ONLY public.vpn_connections ADD CONSTRAINT "vpn_connections_pkey" PRIMARY KEY (id);

-- Foreign keys
ALTER TABLE ONLY public.vpn_certificates ADD CONSTRAINT "vpn_certificates_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;
ALTER TABLE ONLY public.vpn_connections ADD CONSTRAINT "vpn_connections_certificateId_fkey" FOREIGN KEY ("certificateId") REFERENCES public.vpn_certificates(id) ON UPDATE CASCADE ON DELETE CASCADE;


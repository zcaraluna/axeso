-- Script para crear solo el schema (estructura) en NeonDB
-- Ejecutar esto primero, luego importar los datos

-- Limpiar todo primero
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
-- NeonDB maneja los permisos automáticamente, no necesitamos especificar OWNER

-- Crear tabla _prisma_migrations
CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);

-- Crear tabla codigos_activacion
CREATE TABLE public.codigos_activacion (
    id text NOT NULL,
    codigo text NOT NULL,
    usado boolean DEFAULT false NOT NULL,
    "usadoEn" timestamp(3) without time zone,
    "dispositivoFingerprint" text,
    "creadoEn" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "creadoPor" text,
    "expiraEn" timestamp(3) without time zone,
    nombre text,
    activo boolean DEFAULT true NOT NULL
);

-- Crear tabla dispositivos_autorizados
CREATE TABLE public.dispositivos_autorizados (
    id text NOT NULL,
    fingerprint text NOT NULL,
    "userAgent" text,
    "ipAddress" text,
    "codigoActivacionId" text,
    "autorizadoEn" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "ultimoAcceso" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    activo boolean DEFAULT true NOT NULL,
    nombre text
);

-- Crear tabla users
CREATE TABLE public.users (
    id text NOT NULL,
    username text NOT NULL,
    password text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    apellidos text DEFAULT ''::text NOT NULL,
    cedula text,
    credencial text DEFAULT ''::text NOT NULL,
    grado text DEFAULT 'FUNCIONARIO/A'::text NOT NULL,
    nombres text DEFAULT ''::text NOT NULL,
    role text DEFAULT 'user'::text NOT NULL,
    telefono text DEFAULT ''::text NOT NULL,
    "mustChangePassword" boolean DEFAULT true NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL
);

-- Crear tabla visits
CREATE TABLE public.visits (
    id text NOT NULL,
    nombres text NOT NULL,
    apellidos text NOT NULL,
    cedula text NOT NULL,
    telefono text NOT NULL,
    "entryDate" text NOT NULL,
    "entryTime" text NOT NULL,
    "motivoCategoria" text NOT NULL,
    "motivoDescripcion" text NOT NULL,
    photo text,
    "exitDate" text,
    "exitTime" text,
    "registeredBy" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "userId" text NOT NULL,
    "exitRegisteredBy" text,
    "tipoDocumento" text NOT NULL
);

-- Crear índices y constraints
-- PostgreSQL crea automáticamente índices para PRIMARY KEY y UNIQUE, así que solo creamos las constraints
DO $$ 
BEGIN
    -- Primary keys y constraints para _prisma_migrations
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '_prisma_migrations_pkey') THEN
        ALTER TABLE ONLY public._prisma_migrations ADD CONSTRAINT "_prisma_migrations_pkey" PRIMARY KEY (id);
    END IF;

    -- Primary keys y constraints para codigos_activacion
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'codigos_activacion_pkey') THEN
        ALTER TABLE ONLY public.codigos_activacion ADD CONSTRAINT "codigos_activacion_pkey" PRIMARY KEY (id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'codigos_activacion_codigo_key') THEN
        ALTER TABLE ONLY public.codigos_activacion ADD CONSTRAINT "codigos_activacion_codigo_key" UNIQUE (codigo);
    END IF;

    -- Primary keys y constraints para dispositivos_autorizados
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'dispositivos_autorizados_pkey') THEN
        ALTER TABLE ONLY public.dispositivos_autorizados ADD CONSTRAINT "dispositivos_autorizados_pkey" PRIMARY KEY (id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'dispositivos_autorizados_fingerprint_key') THEN
        ALTER TABLE ONLY public.dispositivos_autorizados ADD CONSTRAINT "dispositivos_autorizados_fingerprint_key" UNIQUE (fingerprint);
    END IF;

    -- Primary keys y constraints para users
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_pkey') THEN
        ALTER TABLE ONLY public.users ADD CONSTRAINT "users_pkey" PRIMARY KEY (id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_username_key') THEN
        ALTER TABLE ONLY public.users ADD CONSTRAINT "users_username_key" UNIQUE (username);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_cedula_key') THEN
        ALTER TABLE ONLY public.users ADD CONSTRAINT "users_cedula_key" UNIQUE (cedula);
    END IF;

    -- Primary keys y constraints para visits
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'visits_pkey') THEN
        ALTER TABLE ONLY public.visits ADD CONSTRAINT "visits_pkey" PRIMARY KEY (id);
    END IF;
END $$;

-- Foreign keys (usando IF NOT EXISTS)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'codigos_activacion_creadoPor_fkey') THEN
        ALTER TABLE ONLY public.codigos_activacion ADD CONSTRAINT "codigos_activacion_creadoPor_fkey" FOREIGN KEY ("creadoPor") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'dispositivos_autorizados_codigoActivacionId_fkey') THEN
        ALTER TABLE ONLY public.dispositivos_autorizados ADD CONSTRAINT "dispositivos_autorizados_codigoActivacionId_fkey" FOREIGN KEY ("codigoActivacionId") REFERENCES public.codigos_activacion(id) ON UPDATE CASCADE ON DELETE SET NULL;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'visits_userId_fkey') THEN
        ALTER TABLE ONLY public.visits ADD CONSTRAINT "visits_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;
    END IF;
END $$;

-- Índices adicionales (usando IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS "codigos_activacion_activo_idx" ON public.codigos_activacion USING btree (activo);
CREATE INDEX IF NOT EXISTS "codigos_activacion_codigo_idx" ON public.codigos_activacion USING btree (codigo);
CREATE INDEX IF NOT EXISTS "codigos_activacion_nombre_idx" ON public.codigos_activacion USING btree (nombre);
CREATE INDEX IF NOT EXISTS "codigos_activacion_usado_idx" ON public.codigos_activacion USING btree (usado);
CREATE INDEX IF NOT EXISTS "dispositivos_autorizados_activo_idx" ON public.dispositivos_autorizados USING btree (activo);
CREATE INDEX IF NOT EXISTS "dispositivos_autorizados_fingerprint_idx" ON public.dispositivos_autorizados USING btree (fingerprint);
CREATE INDEX IF NOT EXISTS "dispositivos_autorizados_ultimoAcceso_idx" ON public.dispositivos_autorizados USING btree ("ultimoAcceso");


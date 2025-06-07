-- A1C Estimator Database Schema Backup
-- Project: a1c-estimator (wtaialbbitssvhosbtji)
-- Exported: 2025-06-07

-- =============================================
-- ENUMS
-- =============================================

CREATE TYPE "UserRole" AS ENUM ('admin', 'user', 'caregiver');

-- =============================================
-- FUNCTIONS
-- =============================================

CREATE OR REPLACE FUNCTION public.current_user_id()
 RETURNS text
 LANGUAGE sql
 SECURITY DEFINER
AS $function$
  SELECT nullif(current_setting('request.jwt.claims', true)::json ->> 'sub', '');
$function$;

CREATE OR REPLACE FUNCTION public.get_jwt_claim(claim text)
 RETURNS text
 LANGUAGE sql
 SECURITY DEFINER
AS $function$
  SELECT nullif(current_setting('request.jwt.claims', true)::json ->> claim, '');
$function$;

CREATE OR REPLACE FUNCTION public.get_jwt_claims()
 RETURNS jsonb
 LANGUAGE sql
 SECURITY DEFINER
AS $function$
  SELECT current_setting('request.jwt.claims', true)::jsonb;
$function$;

CREATE OR REPLACE FUNCTION public.requesting_user_id()
 RETURNS text
 LANGUAGE sql
 STABLE
AS $function$
  select nullif(
    current_setting('request.jwt.claims', true)::json ->> 'sub',
    ''
  )
$function$;

-- =============================================
-- TABLES
-- =============================================

-- Prisma Migrations Table
CREATE TABLE "_prisma_migrations" (
    id character varying NOT NULL,
    checksum character varying NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL,
    PRIMARY KEY (id)
);

-- User Table
CREATE TABLE "User" (
    id text NOT NULL,
    user_id text DEFAULT requesting_user_id(),
    email text NOT NULL,
    name text,
    role "UserRole" DEFAULT 'user'::"UserRole" NOT NULL,
    "createdAt" timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp without time zone NOT NULL,
    PRIMARY KEY (id)
);

-- Enable RLS on User table
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;

-- Run Table
CREATE TABLE "Run" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "startDate" timestamp without time zone NOT NULL,
    "endDate" timestamp without time zone,
    "estimatedA1C" double precision,
    notes text,
    "createdAt" timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp without time zone NOT NULL,
    PRIMARY KEY (id)
);

-- Reading Table
CREATE TABLE "Reading" (
    id text NOT NULL,
    "glucoseRunId" text NOT NULL,
    "userId" text NOT NULL,
    "glucoseValue" double precision NOT NULL,
    timestamp timestamp without time zone NOT NULL,
    "mealContext" text,
    notes text,
    "createdAt" timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp without time zone NOT NULL,
    PRIMARY KEY (id)
);

-- FailedJob Table
CREATE TABLE "FailedJob" (
    id text NOT NULL,
    timestamp timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "processName" text NOT NULL,
    data jsonb NOT NULL,
    "failureReason" text NOT NULL,
    "attemptsMade" integer NOT NULL,
    "stackTrace" text,
    retries integer NOT NULL,
    "createdAt" timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp without time zone NOT NULL,
    PRIMARY KEY (id)
);

-- =============================================
-- FOREIGN KEY CONSTRAINTS
-- =============================================

ALTER TABLE "Run" 
ADD CONSTRAINT "Run_userId_fkey" 
FOREIGN KEY ("userId") REFERENCES "User"(id);

ALTER TABLE "Reading" 
ADD CONSTRAINT "Reading_glucoseRunId_fkey" 
FOREIGN KEY ("glucoseRunId") REFERENCES "Run"(id);

ALTER TABLE "Reading" 
ADD CONSTRAINT "Reading_userId_fkey" 
FOREIGN KEY ("userId") REFERENCES "User"(id);

-- =============================================
-- SAMPLE DATA (if needed for reference)
-- =============================================

/*
-- Users
INSERT INTO "User" (id, user_id, email, name, role, "createdAt", "updatedAt") VALUES
('115ed989-5e40-4288-88af-8e8297ca2bd3', null, 'admin@example.com', 'Admin User', 'admin', '2025-05-30 20:15:36.32', '2025-05-30 20:15:36.32'),
('dbe673ea-63a5-4dec-93c7-16cbb43740b6', 'user_2xigNzESME5zveTqEpTbogxTG3K', 'rogeru63@gmail.com', 'Regular User', 'user', '2025-05-30 20:15:36.821', '2025-05-30 20:15:36.821');

-- Runs
INSERT INTO "Run" (id, "userId", "startDate", "endDate", "estimatedA1C", notes, "createdAt", "updatedAt") VALUES
('3ad2eadf-2987-4487-88a0-ca3f459d5c7b', 'dbe673ea-63a5-4dec-93c7-16cbb43740b6', '2023-01-01 00:00:00', '2023-01-07 00:00:00', 5.7, 'Initial test run', '2025-05-30 20:15:37.318', '2025-05-30 20:15:37.318');

-- Readings
INSERT INTO "Reading" (id, "glucoseRunId", "userId", "glucoseValue", timestamp, "mealContext", notes, "createdAt", "updatedAt") VALUES
('2e7dc852-8f4d-4387-b93c-fa6985f4073a', '3ad2eadf-2987-4487-88a0-ca3f459d5c7b', 'dbe673ea-63a5-4dec-93c7-16cbb43740b6', 95, '2023-01-01 14:00:00', 'Fasting', null, '2025-05-30 20:15:37.318', '2025-05-30 20:15:37.318'),
('e5fd4cc9-65af-4e3f-b6b9-655307f249ea', '3ad2eadf-2987-4487-88a0-ca3f459d5c7b', 'dbe673ea-63a5-4dec-93c7-16cbb43740b6', 120, '2023-01-01 18:00:00', 'After meal', null, '2025-05-30 20:15:37.318', '2025-05-30 20:15:37.318'),
('642d2e91-23af-48bf-8141-73c82460a5bc', '3ad2eadf-2987-4487-88a0-ca3f459d5c7b', 'dbe673ea-63a5-4dec-93c7-16cbb43740b6', 110, '2023-01-02 14:00:00', 'Fasting', null, '2025-05-30 20:15:37.318', '2025-05-30 20:15:37.318');

-- Prisma Migration
INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) VALUES
('6cc8eab0-fb25-4b72-a3f8-d5d6a354986c', '27e19862105e1423fdc4fe1b403911a4fdbff75e8b9b10ad62d603dcc146e28f', '2025-05-30 20:04:31.809008+00', '20250530184929_first_prisma_migration', null, null, '2025-05-30 20:04:31.338582+00', 1);
*/

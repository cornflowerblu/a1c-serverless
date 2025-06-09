-- Migration SQL for auth.users integration
-- This script sets up the necessary tables, PKs, indexes, relationships, and policies

-- =============================================
-- EXTENSIONS
-- =============================================

-- Create required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_cron";
CREATE EXTENSION IF NOT EXISTS "pgmq";

-- =============================================
-- TABLES, PRIMARY KEYS AND INDEXES
-- =============================================

-- Create the enum type for roles and profiles table
-- First drop the type if it exists (to avoid errors)
DROP TYPE IF EXISTS public.user_role;

-- Create the enum type for roles in the public schema
CREATE TYPE public.user_role AS ENUM ('admin', 'caregiver', 'user');

-- Create the profiles table with a foreign key reference to auth.users
CREATE TABLE IF NOT EXISTS public.profiles (
  id bigint primary key generated always as identity,
  user_id uuid references auth.users(id),
  role public.user_role DEFAULT 'user',
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
) WITH (OIDS=FALSE);

-- Create tables that reference users
CREATE TABLE IF NOT EXISTS public.glucose_readings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    value NUMERIC NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    meal_context TEXT NOT NULL,
    notes TEXT,
    run_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
) WITH (OIDS=FALSE);

CREATE TABLE IF NOT EXISTS public.months (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    name TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    average_glucose NUMERIC,
    calculated_a1c NUMERIC,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
) WITH (OIDS=FALSE);

CREATE TABLE IF NOT EXISTS public.runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    name TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    month_id UUID REFERENCES public.months(id) ON DELETE SET NULL,
    average_glucose NUMERIC,
    calculated_a1c NUMERIC,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
) WITH (OIDS=FALSE);

-- Now that runs table exists, add the foreign key to glucose_readings
ALTER TABLE public.glucose_readings
  ADD CONSTRAINT glucose_readings_run_id_fkey
  FOREIGN KEY (run_id) REFERENCES public.runs(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.month_runs (
    month_id UUID NOT NULL REFERENCES public.months(id) ON DELETE CASCADE,
    run_id UUID NOT NULL REFERENCES public.runs(id) ON DELETE CASCADE,
    PRIMARY KEY (month_id, run_id)
) WITH (OIDS=FALSE);

CREATE TABLE IF NOT EXISTS public.user_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    caregiver_id UUID NOT NULL REFERENCES auth.users(id),
    permissions JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
) WITH (OIDS=FALSE);

CREATE TABLE IF NOT EXISTS public.user_medical_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id),
    preferred_unit TEXT NOT NULL DEFAULT 'mg/dL',
    diabetes_type TEXT,
    birth_year INTEGER,
    target_a1c NUMERIC,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
) WITH (OIDS=FALSE);

CREATE TABLE IF NOT EXISTS public.user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id),
    theme TEXT NOT NULL DEFAULT 'light',
    display_unit TEXT NOT NULL DEFAULT 'mg/dL',
    reminder_frequency TEXT NOT NULL DEFAULT 'daily',
    reminder_enabled BOOLEAN NOT NULL DEFAULT false,
    target_a1c NUMERIC,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
) WITH (OIDS=FALSE);

CREATE TABLE IF NOT EXISTS public.job_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_type TEXT NOT NULL,
    payload JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING',
    error TEXT,
    priority INT DEFAULT 1,
    result JSONB,
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
) WITH (OIDS=FALSE);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

CREATE INDEX IF NOT EXISTS idx_glucose_readings_user_id ON public.glucose_readings(user_id);
CREATE INDEX IF NOT EXISTS idx_glucose_readings_timestamp ON public.glucose_readings(timestamp);
CREATE INDEX IF NOT EXISTS idx_glucose_readings_run_id ON public.glucose_readings(run_id);

CREATE INDEX IF NOT EXISTS idx_months_user_id ON public.months(user_id);
CREATE INDEX IF NOT EXISTS idx_months_date_range ON public.months(start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_runs_user_id ON public.runs(user_id);
CREATE INDEX IF NOT EXISTS idx_runs_month_id ON public.runs(month_id);
CREATE INDEX IF NOT EXISTS idx_runs_date_range ON public.runs(start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_user_connections_user_id ON public.user_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_user_connections_caregiver_id ON public.user_connections(caregiver_id);

CREATE INDEX IF NOT EXISTS idx_job_queue_status ON public.job_queue(status);
CREATE INDEX IF NOT EXISTS idx_job_queue_job_type ON public.job_queue(job_type);
CREATE INDEX IF NOT EXISTS idx_job_queue_priority_created ON public.job_queue(priority DESC, created_at ASC);

-- =============================================
-- JOB QUEUE FUNCTIONS
-- =============================================

-- -- Function to increment the retry count in a job's payload
-- CREATE OR REPLACE FUNCTION jsonb_set_retry_count(job_id UUID, new_count INT)
-- RETURNS JSONB AS $$
-- DECLARE
--   current_payload JSONB;
-- BEGIN
--   -- Get the current payload
--   SELECT payload INTO current_payload
--   FROM job_queue
--   WHERE id = job_id;
  
--   -- If payload doesn't exist, return NULL
--   IF current_payload IS NULL THEN
--     RETURN NULL;
--   END IF;
  
--   -- Update the retry_count in the payload
--   RETURN jsonb_set(
--     current_payload,
--     '{retry_count}',
--     to_jsonb(new_count)
--   );
-- END;
-- $$ LANGUAGE plpgsql;

-- -- Function to process the next pending job
-- CREATE OR REPLACE FUNCTION process_next_job()
-- RETURNS JSONB AS $$
-- DECLARE
--   job_record RECORD;
--   result JSONB;
-- BEGIN
--   -- Get next pending job with highest priority and oldest creation time
--   SELECT * INTO job_record
--   FROM job_queue 
--   WHERE status = 'PENDING'
--   ORDER BY priority DESC, created_at ASC
--   LIMIT 1
--   FOR UPDATE SKIP LOCKED;
  
--   -- If no pending job, return empty result
--   IF job_record IS NULL THEN
--     RETURN jsonb_build_object(
--       'success', TRUE,
--       'message', 'No pending jobs'
--     );
--   END IF;
  
--   -- Update status to processing
--   UPDATE job_queue 
--   SET status = 'PROCESSING',
--       updated_at = NOW()
--   WHERE id = job_record.id;
  
--   -- Return job information
--   RETURN jsonb_build_object(
--     'success', TRUE,
--     'job_id', job_record.id,
--     'job_type', job_record.job_type,
--     'payload', job_record.payload
--   );
  
-- EXCEPTION
--   WHEN OTHERS THEN
--     -- Return error information
--     RETURN jsonb_build_object(
--       'success', FALSE,
--       'error', SQLERRM
--     );
-- END;
-- $$ LANGUAGE plpgsql;

-- -- Function to mark a job as completed
-- CREATE OR REPLACE FUNCTION complete_job(job_id UUID, result_data JSONB DEFAULT NULL)
-- RETURNS BOOLEAN AS $$
-- BEGIN
--   UPDATE job_queue 
--   SET status = 'COMPLETED',
--       result = result_data,
--       processed_at = NOW(),
--       updated_at = NOW()
--   WHERE id = job_id;
  
--   RETURN FOUND;
-- END;
-- $$ LANGUAGE plpgsql;

-- -- Function to mark a job as failed
-- CREATE OR REPLACE FUNCTION fail_job(job_id UUID, error_message TEXT)
-- RETURNS BOOLEAN AS $$
-- DECLARE
--   current_payload JSONB;
--   retry_count INT;
--   max_retries INT := 3; -- Default max retries
-- BEGIN
--   -- Get current payload and retry count
--   SELECT 
--     payload,
--     COALESCE((payload->>'retry_count')::INT, 0)
--   INTO 
--     current_payload,
--     retry_count
--   FROM job_queue
--   WHERE id = job_id;
  
--   -- Increment retry count
--   retry_count := retry_count + 1;
  
--   -- Update payload with new retry count
--   current_payload := jsonb_set(
--     current_payload,
--     '{retry_count}',
--     to_jsonb(retry_count)
--   );
  
--   -- Check if we should retry or mark as permanently failed
--   IF retry_count <= max_retries THEN
--     -- Mark for retry
--     UPDATE job_queue 
--     SET status = 'RETRY',
--         error = error_message,
--         payload = current_payload,
--         updated_at = NOW()
--     WHERE id = job_id;
--   ELSE
--     -- Mark as failed
--     UPDATE job_queue 
--     SET status = 'FAILED',
--         error = error_message,
--         payload = current_payload,
--         processed_at = NOW(),
--         updated_at = NOW()
--     WHERE id = job_id;
--   END IF;
  
--   RETURN FOUND;
-- END;
-- $$ LANGUAGE plpgsql;

-- -- Function to retry failed jobs
-- CREATE OR REPLACE FUNCTION retry_failed_jobs()
-- RETURNS INT AS $$
-- DECLARE
--   retry_count INT;
-- BEGIN
--   -- Move jobs from RETRY status back to PENDING
--   UPDATE job_queue 
--   SET status = 'PENDING',
--       updated_at = NOW()
--   WHERE status = 'RETRY';
  
--   GET DIAGNOSTICS retry_count = ROW_COUNT;
--   RETURN retry_count;
-- END;
-- $$ LANGUAGE plpgsql;

-- =============================================
-- CRON JOBS
-- =============================================

-- Schedule job to retry failed jobs every 5 minutes
SELECT cron.schedule(
  'retry-failed-jobs',
  '*/5 * * * *',
  $$SELECT retry_failed_jobs()$$
);

-- =============================================
-- PGMQ SETUP
-- =============================================

-- Create message queues for different job types
SELECT pgmq.create('user_created_queue');
SELECT pgmq.create('user_updated_queue');
SELECT pgmq.create('user_deleted_queue');

-- =============================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.glucose_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.months ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_medical_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_queue ENABLE ROW LEVEL SECURITY;

-- Policies for profiles table
CREATE POLICY "Users can view their own profile" 
  ON public.profiles FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
  ON public.profiles FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles" 
  ON public.profiles FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  ));

-- Create policies for glucose_readings
CREATE POLICY "Users can view their own readings" 
  ON public.glucose_readings FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own readings" 
  ON public.glucose_readings FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own readings" 
  ON public.glucose_readings FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own readings" 
  ON public.glucose_readings FOR DELETE 
  USING (auth.uid() = user_id);

CREATE POLICY "Caregivers can view patient readings" 
  ON public.glucose_readings FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM public.user_connections 
    WHERE caregiver_id = auth.uid() AND user_id = glucose_readings.user_id
  ));

-- Policies for months table
CREATE POLICY "Users can view their own months" 
  ON public.months FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own months" 
  ON public.months FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own months" 
  ON public.months FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own months" 
  ON public.months FOR DELETE 
  USING (auth.uid() = user_id);

CREATE POLICY "Caregivers can view patient months" 
  ON public.months FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM public.user_connections 
    WHERE caregiver_id = auth.uid() AND user_id = months.user_id
  ));

-- Policies for runs table
CREATE POLICY "Users can view their own runs" 
  ON public.runs FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own runs" 
  ON public.runs FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own runs" 
  ON public.runs FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own runs" 
  ON public.runs FOR DELETE 
  USING (auth.uid() = user_id);

CREATE POLICY "Caregivers can view patient runs" 
  ON public.runs FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM public.user_connections 
    WHERE caregiver_id = auth.uid() AND user_id = runs.user_id
  ));

-- Policies for user_connections table
CREATE POLICY "Users can view their own connections" 
  ON public.user_connections FOR SELECT 
  USING (auth.uid() = user_id OR auth.uid() = caregiver_id);

CREATE POLICY "Users can create their own connections" 
  ON public.user_connections FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own connections" 
  ON public.user_connections FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own connections" 
  ON public.user_connections FOR DELETE 
  USING (auth.uid() = user_id);

-- Policies for user_medical_profiles table
CREATE POLICY "Users can view their own medical profile" 
  ON public.user_medical_profiles FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own medical profile" 
  ON public.user_medical_profiles FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own medical profile" 
  ON public.user_medical_profiles FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Caregivers can view patient medical profiles" 
  ON public.user_medical_profiles FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM public.user_connections 
    WHERE caregiver_id = auth.uid() AND user_id = user_medical_profiles.user_id
  ));

-- Policies for user_preferences table
CREATE POLICY "Users can view their own preferences" 
  ON public.user_preferences FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences" 
  ON public.user_preferences FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences" 
  ON public.user_preferences FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Caregivers can view patient preferences" 
  ON public.user_preferences FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM public.user_connections 
    WHERE caregiver_id = auth.uid() AND user_id = user_preferences.user_id
  ));

-- Policies for job_queue table (admin only)
CREATE POLICY "Admin access to job queue" 
  ON public.job_queue 
  USING (EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  ));

-- =============================================
-- HELPER FUNCTIONS
-- =============================================

-- Function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text
LANGUAGE sql SECURITY DEFINER
AS $$
  SELECT role::text
  FROM public.profiles 
  WHERE user_id = auth.uid();
$$;

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql SECURITY DEFINER
AS $$
  SELECT role = 'admin'
  FROM public.profiles 
  WHERE user_id = auth.uid();
$$;

-- Function to check if user is caregiver for another user
CREATE OR REPLACE FUNCTION public.is_caregiver_for(patient_id uuid)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.user_connections 
    WHERE caregiver_id = auth.uid() AND user_id = patient_id
  );
$$;

-- Function to create a profile for a new user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, role)
  VALUES (new.id, 'user');
  RETURN new;
END;
$$;

-- Trigger to create a profile when a new user is created
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
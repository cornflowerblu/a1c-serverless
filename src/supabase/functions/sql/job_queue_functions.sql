-- Function to increment the retry count in a job's payload
CREATE OR REPLACE FUNCTION jsonb_set_retry_count(job_id UUID, new_count INT)
RETURNS JSONB AS $$
DECLARE
  current_payload JSONB;
BEGIN
  -- Get the current payload
  SELECT payload INTO current_payload
  FROM job_queue
  WHERE id = job_id;
  
  -- If payload doesn't exist, return NULL
  IF current_payload IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Update the retry_count in the payload
  RETURN jsonb_set(
    current_payload,
    '{retry_count}',
    to_jsonb(new_count)
  );
END;
$$ LANGUAGE plpgsql;

-- Function to process the next pending job
CREATE OR REPLACE FUNCTION process_next_job()
RETURNS JSONB AS $$
DECLARE
  job_record RECORD;
  result JSONB;
BEGIN
  -- Get next pending job with highest priority and oldest creation time
  SELECT * INTO job_record
  FROM job_queue 
  WHERE status = 'PENDING'
  ORDER BY priority DESC, created_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;
  
  -- If no pending job, return empty result
  IF job_record IS NULL THEN
    RETURN jsonb_build_object(
      'success', TRUE,
      'message', 'No pending jobs'
    );
  END IF;
  
  -- Update status to processing
  UPDATE job_queue 
  SET status = 'PROCESSING',
      updated_at = NOW()
  WHERE id = job_record.id;
  
  -- Return job information
  RETURN jsonb_build_object(
    'success', TRUE,
    'job_id', job_record.id,
    'job_type', job_record.job_type,
    'payload', job_record.payload
  );
  
EXCEPTION
  WHEN OTHERS THEN
    -- Return error information
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql;

-- Function to mark a job as completed
CREATE OR REPLACE FUNCTION complete_job(job_id UUID, result_data JSONB DEFAULT NULL)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE job_queue 
  SET status = 'COMPLETED',
      result = result_data,
      processed_at = NOW(),
      updated_at = NOW()
  WHERE id = job_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Function to mark a job as failed
CREATE OR REPLACE FUNCTION fail_job(job_id UUID, error_message TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  current_payload JSONB;
  retry_count INT;
  max_retries INT := 3; -- Default max retries
BEGIN
  -- Get current payload and retry count
  SELECT 
    payload,
    COALESCE((payload->>'retry_count')::INT, 0)
  INTO 
    current_payload,
    retry_count
  FROM job_queue
  WHERE id = job_id;
  
  -- Increment retry count
  retry_count := retry_count + 1;
  
  -- Update payload with new retry count
  current_payload := jsonb_set(
    current_payload,
    '{retry_count}',
    to_jsonb(retry_count)
  );
  
  -- Check if we should retry or mark as permanently failed
  IF retry_count <= max_retries THEN
    -- Mark for retry
    UPDATE job_queue 
    SET status = 'RETRY',
        error = error_message,
        payload = current_payload,
        updated_at = NOW()
    WHERE id = job_id;
  ELSE
    -- Mark as failed
    UPDATE job_queue 
    SET status = 'FAILED',
        error = error_message,
        payload = current_payload,
        processed_at = NOW(),
        updated_at = NOW()
    WHERE id = job_id;
  END IF;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Function to retry failed jobs
CREATE OR REPLACE FUNCTION retry_failed_jobs()
RETURNS INT AS $$
DECLARE
  retry_count INT;
BEGIN
  -- Move jobs from RETRY status back to PENDING
  UPDATE job_queue 
  SET status = 'PENDING',
      updated_at = NOW()
  WHERE status = 'RETRY';
  
  GET DIAGNOSTICS retry_count = ROW_COUNT;
  RETURN retry_count;
END;
$$ LANGUAGE plpgsql;
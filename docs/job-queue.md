# Job Queue System Documentation

## Overview

The A1C Estimator application uses a database-backed job queue system to handle background processing tasks asynchronously. This ensures that user-facing operations remain fast while computationally intensive tasks like A1C calculations, report generation, and notifications are processed in the background.

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   User Action   │───▶│   Create Job    │───▶│  Process Job    │
│ (Add Reading)   │    │   (API Call)    │    │ (Background)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │                        │
                              ▼                        ▼
                       ┌─────────────────┐    ┌─────────────────┐
                       │   job_queue     │    │   Update A1C    │
                       │     table       │    │   Estimates     │
                       └─────────────────┘    └─────────────────┘
```

## Database Schema

### job_queue Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key, auto-generated |
| `job_type` | VARCHAR | Type of job to process |
| `payload` | JSONB | Job-specific data and parameters |
| `status` | VARCHAR | Current job status (PENDING, PROCESSING, COMPLETED, FAILED) |
| `created_at` | TIMESTAMPTZ | When the job was created |
| `updated_at` | TIMESTAMPTZ | Last status update |
| `processed_at` | TIMESTAMPTZ | When the job was completed/failed |
| `error` | TEXT | Error message if job failed |

### Job Statuses

- **PENDING**: Job created, waiting to be processed
- **PROCESSING**: Job currently being executed
- **COMPLETED**: Job finished successfully
- **FAILED**: Job encountered an error and failed
- **RETRY**: Job failed but will be retried

## Job Types

### 1. CALCULATE_A1C
**Purpose**: Calculate A1C estimates when new glucose readings are added

**Payload Structure**:
```json
{
  "user_id": "uuid",
  "reading_id": "uuid",
  "calculation_type": "immediate|batch"
}
```

**Processing Logic**:
- Fetch user's recent glucose readings
- Apply A1C calculation algorithm
- Update user's A1C estimates in database
- Trigger notifications if thresholds are crossed

### 2. SEND_REMINDER
**Purpose**: Send reading reminders to users based on their preferences

**Payload Structure**:
```json
{
  "user_id": "uuid",
  "reminder_type": "daily|weekly|custom",
  "notification_method": "email|push|in_app"
}
```

**Processing Logic**:
- Check user's reminder preferences
- Verify last reading timestamp
- Send appropriate notification
- Schedule next reminder

### 3. GENERATE_REPORT
**Purpose**: Generate periodic reports (weekly/monthly summaries)

**Payload Structure**:
```json
{
  "user_id": "uuid",
  "report_type": "weekly|monthly|quarterly",
  "date_range": {
    "start": "2024-01-01",
    "end": "2024-01-31"
  }
}
```

**Processing Logic**:
- Aggregate glucose readings for period
- Calculate statistics and trends
- Generate report document
- Store in user's reports

### 4. CLEANUP_DATA
**Purpose**: Archive old data and maintain database performance

**Payload Structure**:
```json
{
  "cleanup_type": "archive|delete",
  "older_than_days": 365,
  "tables": ["glucose_readings", "job_queue"]
}
```

**Processing Logic**:
- Identify records older than threshold
- Archive to cold storage or delete
- Update cleanup logs
- Optimize database indexes

## Job Processing

### Job Creation

Jobs are created by API endpoints when specific events occur:

```typescript
// Example: Creating A1C calculation job
async function createA1CCalculationJob(userId: string, readingId: string) {
  const { error } = await supabase
    .from('job_queue')
    .insert({
      job_type: 'CALCULATE_A1C',
      payload: {
        user_id: userId,
        reading_id: readingId,
        calculation_type: 'immediate'
      },
      status: 'PENDING'
    });
    
  if (error) {
    console.error('Failed to create job:', error);
    throw error;
  }
}
```

### Job Processing Engine

The job processing is handled by PostgreSQL functions triggered by pg_cron:

```sql
-- Job processor function (to be implemented)
CREATE OR REPLACE FUNCTION process_pending_jobs()
RETURNS void AS $$
DECLARE
  job_record RECORD;
BEGIN
  -- Get next pending job
  SELECT * INTO job_record
  FROM job_queue 
  WHERE status = 'PENDING'
  ORDER BY created_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;
  
  IF job_record IS NOT NULL THEN
    -- Update status to processing
    UPDATE job_queue 
    SET status = 'PROCESSING', updated_at = NOW()
    WHERE id = job_record.id;
    
    -- Process job based on type
    CASE job_record.job_type
      WHEN 'CALCULATE_A1C' THEN
        PERFORM process_a1c_calculation(job_record.payload);
      WHEN 'SEND_REMINDER' THEN
        PERFORM process_reminder(job_record.payload);
      -- Add other job types
    END CASE;
    
    -- Mark as completed
    UPDATE job_queue 
    SET status = 'COMPLETED', processed_at = NOW()
    WHERE id = job_record.id;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    -- Mark as failed with error
    UPDATE job_queue 
    SET status = 'FAILED', 
        error = SQLERRM,
        processed_at = NOW()
    WHERE id = job_record.id;
END;
$$ LANGUAGE plpgsql;
```

### Scheduling with pg_cron

```sql
-- Schedule job processor to run every minute
SELECT cron.schedule('process-jobs', '* * * * *', 'SELECT process_pending_jobs();');
```

## Error Handling and Retry Logic

### Retry Strategy

Failed jobs can be automatically retried with exponential backoff:

```sql
-- Retry failed jobs (to be implemented)
CREATE OR REPLACE FUNCTION retry_failed_jobs()
RETURNS void AS $$
BEGIN
  UPDATE job_queue 
  SET status = 'PENDING',
      updated_at = NOW()
  WHERE status = 'FAILED'
    AND created_at > NOW() - INTERVAL '24 hours'  -- Only retry recent failures
    AND (payload->>'retry_count')::int < 3;       -- Max 3 retries
END;
$$ LANGUAGE plpgsql;
```

### Dead Letter Queue

Jobs that fail repeatedly are moved to a dead letter status for manual investigation:

```sql
-- Mark permanently failed jobs
UPDATE job_queue 
SET status = 'DEAD_LETTER'
WHERE status = 'FAILED'
  AND (payload->>'retry_count')::int >= 3;
```

## Monitoring and Observability

### Job Queue Metrics

Monitor job queue health with these queries:

```sql
-- Job status summary
SELECT 
  job_type,
  status,
  COUNT(*) as count,
  AVG(EXTRACT(EPOCH FROM (processed_at - created_at))) as avg_processing_time_seconds
FROM job_queue 
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY job_type, status;

-- Failed jobs analysis
SELECT 
  job_type,
  error,
  COUNT(*) as failure_count
FROM job_queue 
WHERE status = 'FAILED'
  AND created_at > NOW() - INTERVAL '7 days'
GROUP BY job_type, error
ORDER BY failure_count DESC;
```

### Alerts and Notifications

Set up monitoring for:
- High number of failed jobs
- Jobs stuck in PROCESSING status
- Queue backlog growing too large
- Processing time exceeding thresholds

## Implementation Status

### ✅ Completed
- [x] Job queue table schema
- [x] TypeScript type definitions
- [x] Basic database structure

### 🚧 In Progress
- [ ] Job processing functions
- [ ] pg_cron setup
- [ ] API integration for job creation

### 📋 Planned
- [ ] A1C calculation job processor
- [ ] Reminder system job processor
- [ ] Report generation job processor
- [ ] Monitoring dashboard
- [ ] Error alerting system

## Usage Examples

### Creating Jobs from API Endpoints

```typescript
// In your API route (e.g., POST /api/readings)
export async function POST(request: NextRequest) {
  // ... create glucose reading ...
  
  // Create background job for A1C calculation
  await createA1CCalculationJob(userData.id, newReading.id);
  
  return NextResponse.json({ reading: newReading });
}
```

### Monitoring Job Status

```typescript
// Check job status
async function getJobStatus(jobId: string) {
  const { data, error } = await supabase
    .from('job_queue')
    .select('status, error, processed_at')
    .eq('id', jobId)
    .single();
    
  return data;
}
```

## Best Practices

1. **Keep Jobs Idempotent**: Jobs should be safe to run multiple times
2. **Use Appropriate Timeouts**: Set reasonable processing time limits
3. **Log Extensively**: Include detailed logging for debugging
4. **Monitor Queue Depth**: Alert when queue grows too large
5. **Graceful Degradation**: Handle job failures without breaking user experience
6. **Batch Similar Jobs**: Group related operations for efficiency

## Security Considerations

- Jobs should validate payload data before processing
- Sensitive data in payloads should be encrypted
- Job processors should run with minimal required permissions
- Audit logging for job creation and processing

## Performance Optimization

- Use database indexes on `status` and `created_at` columns
- Implement job batching for similar operations
- Consider job prioritization for critical tasks
- Regular cleanup of old completed jobs

---

*Last updated: June 2025*
*Status: Implementation in progress*

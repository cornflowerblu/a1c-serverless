/**
 * Webhook Job Queue Verification Utility
 * 
 * This module provides utilities for verifying job queue entries and job processing
 * for webhook-triggered user operations.
 */

import { createClient } from '@supabase/supabase-js';
import { ClerkWebhookEvent } from './clerk-webhook-test-utils';

// Job types for user sync operations
export const JOB_TYPES = {
  USER_CREATED: 'USER_CREATED',
  USER_UPDATED: 'USER_UPDATED',
  USER_DELETED: 'USER_DELETED'
};

/**
 * Job verification result interface
 */
export interface JobVerificationResult {
  success: boolean;
  message: string;
  jobId?: string;
  jobStatus?: string;
  details?: {
    expected?: any;
    actual?: any;
    diff?: any;
  };
}

/**
 * Job verification options
 */
export interface JobVerificationOptions {
  supabaseUrl?: string;
  supabaseKey?: string;
  timeout?: number;
  maxRetries?: number;
  retryInterval?: number;
}

/**
 * Create a Supabase client for verification
 */
function createVerificationClient(options: JobVerificationOptions = {}) {
  const supabaseUrl = options.supabaseUrl || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseKey = options.supabaseKey || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase credentials for verification');
  }
  
  return createClient(supabaseUrl, supabaseKey);
}

/**
 * Verify that a job was created for a webhook event
 */
export async function verifyJobCreated(
  eventType: string,
  userId: string,
  options: JobVerificationOptions = {}
): Promise<JobVerificationResult> {
  const supabase = createVerificationClient(options);
  
  try {
    // Map event type to job type
    let jobType;
    switch (eventType) {
      case 'user.created':
        jobType = JOB_TYPES.USER_CREATED;
        break;
      case 'user.updated':
        jobType = JOB_TYPES.USER_UPDATED;
        break;
      case 'user.deleted':
        jobType = JOB_TYPES.USER_DELETED;
        break;
      default:
        return {
          success: false,
          message: `Unsupported event type: ${eventType}`
        };
    }
    
    // Find the job in the queue
    const { data: jobs, error } = await supabase
      .from('job_queue')
      .select('*')
      .eq('job_type', jobType)
      .filter('payload->clerk_id', 'eq', userId)
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (error) {
      return {
        success: false,
        message: `Error querying job queue: ${error.message}`
      };
    }
    
    if (!jobs || jobs.length === 0) {
      return {
        success: false,
        message: `No job found for ${eventType} event with user ID ${userId}`
      };
    }
    
    const job = jobs[0];
    
    return {
      success: true,
      message: `Found job for ${eventType} event with user ID ${userId}`,
      jobId: job.id,
      jobStatus: job.status,
      details: {
        actual: job
      }
    };
  } catch (error) {
    return {
      success: false,
      message: `Verification error: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Wait for a job to reach a specific status
 */
export async function waitForJobStatus(
  jobId: string,
  expectedStatus: string,
  options: JobVerificationOptions = {}
): Promise<JobVerificationResult> {
  const supabase = createVerificationClient(options);
  const maxRetries = options.maxRetries || 10;
  const retryInterval = options.retryInterval || 500;
  
  let attempts = 0;
  
  while (attempts < maxRetries) {
    const { data: job, error } = await supabase
      .from('job_queue')
      .select('*')
      .eq('id', jobId)
      .single();
    
    if (error) {
      return {
        success: false,
        message: `Error fetching job: ${error.message}`
      };
    }
    
    if (job.status === expectedStatus) {
      return {
        success: true,
        message: `Job ${jobId} has reached status ${expectedStatus}`,
        jobId,
        jobStatus: job.status,
        details: {
          actual: job
        }
      };
    }
    
    // If job failed, return immediately
    if (job.status === 'FAILED') {
      return {
        success: false,
        message: `Job ${jobId} failed: ${job.error || 'Unknown error'}`,
        jobId,
        jobStatus: job.status,
        details: {
          actual: job
        }
      };
    }
    
    // Wait before retrying
    await new Promise(resolve => setTimeout(resolve, retryInterval));
    attempts++;
  }
  
  // Get the final status
  const { data: job, error } = await supabase
    .from('job_queue')
    .select('*')
    .eq('id', jobId)
    .single();
  
  if (error) {
    return {
      success: false,
      message: `Error fetching job: ${error.message}`
    };
  }
  
  return {
    success: false,
    message: `Timed out waiting for job ${jobId} to reach status ${expectedStatus}, current status: ${job.status}`,
    jobId,
    jobStatus: job.status,
    details: {
      expected: expectedStatus,
      actual: job
    }
  };
}

/**
 * Trigger job processing for a specific job
 */
export async function triggerJobProcessing(
  jobId: string,
  options: JobVerificationOptions = {}
): Promise<JobVerificationResult> {
  const supabase = createVerificationClient(options);
  
  try {
    // Call the job processor function
    const response = await fetch(
      `${options.supabaseUrl || process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/user-job-processor`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${options.supabaseKey || process.env.SUPABASE_SERVICE_ROLE_KEY}`
        }
      }
    );
    
    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        message: `Error triggering job processor: ${response.status} ${response.statusText} - ${errorText}`
      };
    }
    
    const result = await response.json();
    
    if (!result.success) {
      return {
        success: false,
        message: `Job processor reported error: ${result.error || 'Unknown error'}`,
        details: {
          actual: result
        }
      };
    }
    
    // Check if this was our job
    if (result.jobId === jobId) {
      return {
        success: true,
        message: `Successfully processed job ${jobId}`,
        jobId,
        details: {
          actual: result
        }
      };
    }
    
    // If it was a different job, we need to trigger again
    return {
      success: false,
      message: `Processed job ${result.jobId}, but waiting for job ${jobId}`,
      details: {
        actual: result
      }
    };
  } catch (error) {
    return {
      success: false,
      message: `Error triggering job processor: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Process a job until completion or failure
 */
export async function processJobToCompletion(
  jobId: string,
  options: JobVerificationOptions = {}
): Promise<JobVerificationResult> {
  const maxRetries = options.maxRetries || 5;
  let attempts = 0;
  
  while (attempts < maxRetries) {
    // Trigger job processing
    const triggerResult = await triggerJobProcessing(jobId, options);
    
    if (triggerResult.success) {
      // Job was processed, check its status
      const statusResult = await waitForJobStatus(jobId, 'COMPLETED', {
        ...options,
        maxRetries: 1 // Just check once since we already processed it
      });
      
      if (statusResult.success) {
        return statusResult;
      }
      
      // If job failed, return the failure
      if (statusResult.jobStatus === 'FAILED') {
        return statusResult;
      }
    }
    
    // Wait before retrying
    await new Promise(resolve => setTimeout(resolve, options.retryInterval || 500));
    attempts++;
  }
  
  return {
    success: false,
    message: `Failed to process job ${jobId} after ${maxRetries} attempts`,
    jobId
  };
}

/**
 * Verify the complete flow from webhook event to job creation to job processing
 */
export async function verifyWebhookJobFlow(
  event: ClerkWebhookEvent,
  options: JobVerificationOptions = {}
): Promise<JobVerificationResult> {
  try {
    // Step 1: Verify job was created
    const jobCreationResult = await verifyJobCreated(event.type, event.data.id, options);
    
    if (!jobCreationResult.success) {
      return jobCreationResult;
    }
    
    const jobId = jobCreationResult.jobId!;
    
    // Step 2: Process the job
    const processingResult = await processJobToCompletion(jobId, options);
    
    if (!processingResult.success) {
      return processingResult;
    }
    
    // Step 3: Verify database state based on event type
    // This would use the existing database verification utilities
    
    return {
      success: true,
      message: `Successfully verified complete flow for ${event.type} event`,
      jobId,
      details: processingResult.details
    };
  } catch (error) {
    return {
      success: false,
      message: `Error verifying webhook job flow: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}
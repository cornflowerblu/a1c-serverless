/**
 * Webhook Database Verification Utility
 * 
 * This module provides utilities for verifying database state after webhook execution,
 * including detailed comparison and reporting for verification failures.
 */

import { createClient } from '@supabase/supabase-js';
import { ClerkWebhookEvent } from './clerk-webhook-test-utils';

/**
 * Verification result interface
 */
export interface VerificationResult {
  success: boolean;
  message: string;
  details?: {
    expected?: any;
    actual?: any;
    diff?: any;
  };
}

/**
 * Database state verification options
 */
export interface VerificationOptions {
  supabaseUrl?: string;
  supabaseKey?: string;
  timeout?: number;
}

/**
 * Create a Supabase client for verification
 */
function createVerificationClient(options: VerificationOptions = {}) {
  const supabaseUrl = options.supabaseUrl || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseKey = options.supabaseKey || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase credentials for verification');
  }
  
  return createClient(supabaseUrl, supabaseKey);
}

/**
 * Get the current database state for a user
 */
export async function getDatabaseState(
  userId: string,
  options: VerificationOptions = {}
): Promise<any> {
  const supabase = createVerificationClient(options);
  
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('clerk_id', userId)
    .maybeSingle();
  
  if (error) {
    throw new Error(`Error fetching database state: ${error.message}`);
  }
  
  return data;
}

/**
 * Verify that a user exists in the database with the expected data
 */
export async function verifyUserExists(
  userId: string,
  expectedData: Record<string, any>,
  options: VerificationOptions = {}
): Promise<VerificationResult> {
  try {
    const userData = await getDatabaseState(userId, options);
    
    if (!userData) {
      return {
        success: false,
        message: `User with clerk_id ${userId} does not exist in the database`,
        details: {
          expected: expectedData,
          actual: null
        }
      };
    }
    
    // Check if all expected fields match
    const mismatches: Record<string, { expected: any; actual: any }> = {};
    
    for (const [key, expectedValue] of Object.entries(expectedData)) {
      if (userData[key] !== expectedValue) {
        mismatches[key] = {
          expected: expectedValue,
          actual: userData[key]
        };
      }
    }
    
    if (Object.keys(mismatches).length > 0) {
      return {
        success: false,
        message: `User exists but data doesn't match expectations`,
        details: {
          expected: expectedData,
          actual: userData,
          diff: mismatches
        }
      };
    }
    
    return {
      success: true,
      message: `User exists with expected data`,
      details: {
        actual: userData
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
 * Verify that a user was updated with the expected data
 */
export async function verifyUserUpdated(
  userId: string,
  expectedData: Record<string, any>,
  options: VerificationOptions = {}
): Promise<VerificationResult> {
  // This is similar to verifyUserExists but focuses on the updated fields
  return verifyUserExists(userId, expectedData, options);
}

/**
 * Verify that a user was deleted from the database
 */
export async function verifyUserDeleted(
  userId: string,
  options: VerificationOptions = {}
): Promise<VerificationResult> {
  try {
    const userData = await getDatabaseState(userId, options);
    
    if (userData) {
      return {
        success: false,
        message: `User with clerk_id ${userId} still exists in the database`,
        details: {
          expected: null,
          actual: userData
        }
      };
    }
    
    return {
      success: true,
      message: `User with clerk_id ${userId} was successfully deleted`
    };
  } catch (error) {
    return {
      success: false,
      message: `Verification error: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Verify database state based on webhook event type
 */
export async function verifyWebhookEffect(
  event: ClerkWebhookEvent,
  expectedData?: Record<string, any>,
  options: VerificationOptions = {}
): Promise<VerificationResult> {
  const userId = event.data.id;
  
  switch (event.type) {
    case 'user.created':
      return verifyUserExists(userId, expectedData || {
        clerk_id: userId,
        email: event.data.email_addresses[0]?.email_address,
        name: `${event.data.first_name || ''} ${event.data.last_name || ''}`.trim()
      }, options);
    
    case 'user.updated':
      return verifyUserUpdated(userId, expectedData || {}, options);
    
    case 'user.deleted':
      return verifyUserDeleted(userId, options);
    
    default:
      return {
        success: false,
        message: `Unsupported event type: ${event.type}`
      };
  }
}

/**
 * Wait for database changes with timeout and retries
 */
export async function waitForDatabaseChange(
  checkFn: () => Promise<VerificationResult>,
  options: { timeout?: number; interval?: number; maxRetries?: number } = {}
): Promise<VerificationResult> {
  const {
    timeout = 5000,
    interval = 500,
    maxRetries = 10
  } = options;
  
  let retries = 0;
  
  while (retries < maxRetries) {
    const result = await checkFn();
    
    if (result.success) {
      return result;
    }
    
    // Wait before retrying
    await new Promise(resolve => setTimeout(resolve, interval));
    retries++;
  }
  
  const lastResult = await checkFn();
  
  if (!lastResult.success) {
    return {
      ...lastResult,
      message: `Timed out waiting for database change: ${lastResult.message}`
    };
  }
  
  return lastResult;
}
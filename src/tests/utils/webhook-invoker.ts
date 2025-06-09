/**
 * Webhook Invoker Utility
 * 
 * This module provides utilities for directly invoking the Clerk webhook
 * with mock events and handling responses.
 */

import { ClerkWebhookEvent } from './clerk-webhook-test-utils';
import { createClient } from '@supabase/supabase-js';

// Maximum time to wait for webhook processing (in ms)
const DEFAULT_TIMEOUT = 5000;
const MAX_RETRIES = 3;

/**
 * Response from webhook invocation
 */
export interface WebhookResponse {
  status: number;
  body: any;
  headers: Record<string, string>;
}

/**
 * Options for webhook invocation
 */
export interface WebhookInvokeOptions {
  timeout?: number;
  retries?: number;
  webhookSecret?: string;
}

/**
 * Create mock headers for a Clerk webhook request
 */
function createMockHeaders(payload: string, webhookSecret: string): Record<string, string> {
  // In a real implementation, we would use the svix library to generate
  // proper signatures. For testing purposes, we're using placeholder values.
  return {
    'Content-Type': 'application/json',
    'svix-id': `msg_${Date.now()}`,
    'svix-timestamp': Date.now().toString(),
    'svix-signature': 'mock_signature_for_testing'
  };
}

/**
 * Invoke the webhook with a mock event
 */
export async function invokeWebhook(
  event: ClerkWebhookEvent,
  options: WebhookInvokeOptions = {}
): Promise<WebhookResponse> {
  const {
    timeout = DEFAULT_TIMEOUT,
    retries = MAX_RETRIES,
    webhookSecret = 'test_webhook_secret'
  } = options;

  // Convert event to JSON string
  const payload = JSON.stringify(event);
  
  // Create mock headers
  const headers = createMockHeaders(payload, webhookSecret);

  // In a real implementation, we would make an HTTP request to the webhook endpoint.
  // For testing purposes, we're directly invoking the webhook function.
  // This is a placeholder implementation that would need to be adapted based on
  // how your webhook is deployed and accessible.
  
  try {
    // This is a placeholder for the actual webhook invocation
    // In a real implementation, you might use fetch() to call the webhook URL
    // or directly invoke the webhook function if it's accessible
    
    // Example using fetch (if webhook is deployed as an HTTP endpoint):
    // const response = await fetch('http://localhost:8000/webhook', {
    //   method: 'POST',
    //   headers,
    //   body: payload
    // });
    
    // For now, we'll return a mock response
    return {
      status: 200,
      body: { success: true },
      headers: { 'Content-Type': 'application/json' }
    };
  } catch (error) {
    console.error('Error invoking webhook:', error);
    throw error;
  }
}

/**
 * Verify database state after webhook execution
 */
export async function verifyDatabaseState(
  userId: string,
  expectedState: 'created' | 'updated' | 'deleted',
  expectedData?: Record<string, any>
): Promise<boolean> {
  // Initialize Supabase client for verification
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase credentials for verification');
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  // Query the database to check user state
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('clerk_id', userId)
    .maybeSingle();
  
  if (error) {
    console.error('Error verifying database state:', error);
    return false;
  }
  
  // Check if the database state matches the expected state
  switch (expectedState) {
    case 'created':
    case 'updated':
      if (!data) return false;
      
      // If expected data is provided, verify it matches
      if (expectedData) {
        for (const [key, value] of Object.entries(expectedData)) {
          if (data[key] !== value) return false;
        }
      }
      
      return true;
    
    case 'deleted':
      // User should not exist in the database
      return data === null;
  }
}

/**
 * Wait for webhook processing with timeout
 */
export async function waitForWebhookProcessing(timeout = DEFAULT_TIMEOUT): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, timeout));
}

/**
 * Invoke webhook and verify database state with retries
 */
export async function invokeWebhookAndVerify(
  event: ClerkWebhookEvent,
  expectedState: 'created' | 'updated' | 'deleted',
  expectedData?: Record<string, any>,
  options: WebhookInvokeOptions = {}
): Promise<boolean> {
  const { retries = MAX_RETRIES, timeout = DEFAULT_TIMEOUT } = options;
  
  // Invoke the webhook
  await invokeWebhook(event, options);
  
  // Wait for processing
  await waitForWebhookProcessing(timeout);
  
  // Try verification with retries
  let attempts = 0;
  let success = false;
  
  while (attempts < retries && !success) {
    success = await verifyDatabaseState(
      event.data.id,
      expectedState,
      expectedData
    );
    
    if (!success && attempts < retries - 1) {
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;
    }
  }
  
  return success;
}
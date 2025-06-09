import { defineConfig } from 'cypress';
import { 
  invokeWebhook,
  verifyDatabaseState 
} from './src/tests/utils/webhook-invoker';
import {
  verifyUserExists,
  verifyUserUpdated,
  verifyUserDeleted
} from './src/tests/utils/webhook-db-verifier';
import {
  removeTestUser,
  removeAllTestUsers
} from './src/tests/utils/webhook-test-cleanup';
import {
  verifyJobCreated,
  waitForJobStatus,
  processJobToCompletion,
  verifyWebhookJobFlow
} from './src/tests/utils/webhook-job-verifier';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    setupNodeEvents(on, config) {
      // Register custom tasks for webhook testing
      on('task', {
        // Webhook invocation tasks
        invokeWebhook: ({ event, options = {} }) => {
          return invokeWebhook(event, options);
        },
        
        // Database verification tasks
        verifyUserExists: ({ userId, expectedData, options = {} }) => {
          return verifyUserExists(userId, expectedData, options);
        },
        verifyUserUpdated: ({ userId, expectedData, options = {} }) => {
          return verifyUserUpdated(userId, expectedData, options);
        },
        verifyUserDeleted: ({ userId, options = {} }) => {
          return verifyUserDeleted(userId, options);
        },
        verifyDatabaseState: ({ userId, expectedState, expectedData, options = {} }) => {
          return verifyDatabaseState(userId, expectedState, expectedData);
        },
        
        // Cleanup tasks
        removeTestUser: ({ userId, options = {} }) => {
          return removeTestUser(userId, options);
        },
        removeAllTestUsers: (options = {}) => {
          return removeAllTestUsers(options);
        },
        
        // Job queue verification tasks
        verifyJobCreated: ({ eventType, userId, options = {} }) => {
          return verifyJobCreated(eventType, userId, options);
        },
        waitForJobStatus: ({ jobId, expectedStatus, options = {} }) => {
          return waitForJobStatus(jobId, expectedStatus, options);
        },
        processJobToCompletion: ({ jobId, options = {} }) => {
          return processJobToCompletion(jobId, options);
        },
        verifyWebhookJobFlow: ({ event, options = {} }) => {
          return verifyWebhookJobFlow(event, options);
        },
        simulateFailedJobAttempt: ({ jobId, error }) => {
          // This is a helper for testing retry logic
          const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
          const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
          
          if (!supabaseUrl || !supabaseKey) {
            return { success: false, message: 'Missing Supabase credentials' };
          }
          
          const { createClient } = require('@supabase/supabase-js');
          const supabase = createClient(supabaseUrl, supabaseKey);
          
          return supabase
            .from('job_queue')
            .update({
              status: 'FAILED',
              error: error || 'Simulated failure',
              updated_at: new Date().toISOString(),
              processed_at: new Date().toISOString(),
              payload: supabase.rpc('jsonb_set_retry_count', { 
                job_id: jobId,
                new_count: 1
              })
            })
            .eq('id', jobId)
            .then(({ error }) => {
              if (error) {
                return { success: false, error };
              }
              return { success: true };
            });
        }
      });
      
      return config;
    },
  },
});
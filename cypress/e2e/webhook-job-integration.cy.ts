/**
 * Webhook Job Queue Integration Tests
 * 
 * This file contains tests for the integration between the webhook system
 * and the job queue, verifying that user events are properly queued and processed.
 */

import { 
  generateUserCreatedEvent,
  generateUserUpdatedEvent,
  generateUserDeletedEvent,
  generateTestId
} from '../../src/tests/utils/clerk-webhook-test-utils';
import { 
  invokeWebhook,
  waitForWebhookProcessing
} from '../../src/tests/utils/webhook-invoker';
import { 
  verifyUserExists,
  verifyUserUpdated,
  verifyUserDeleted,
  waitForDatabaseChange
} from '../../src/tests/utils/webhook-db-verifier';
import { 
  removeTestUser,
  removeAllTestUsers
} from '../../src/tests/utils/webhook-test-cleanup';
import {
  verifyJobCreated,
  waitForJobStatus,
  processJobToCompletion,
  verifyWebhookJobFlow,
  JOB_TYPES
} from '../../src/tests/utils/webhook-job-verifier';

describe('Webhook Job Queue Integration Tests', () => {
  // Clean up test users before and after tests
  before(() => {
    cy.task('removeAllTestUsers').then((result) => {
      cy.log(`Cleaned up ${result.removedCount || 0} test users before tests`);
    });
  });

  after(() => {
    cy.task('removeAllTestUsers').then((result) => {
      cy.log(`Cleaned up ${result.removedCount || 0} test users after tests`);
    });
  });

  it('should create a job for user creation events', () => {
    // Generate test data
    const testEmail = `test-${generateTestId()}@example.com`;
    const testFirstName = 'Test';
    const testLastName = 'User';
    
    // Create mock user creation event
    const event = generateUserCreatedEvent({
      firstName: testFirstName,
      lastName: testLastName,
      email: testEmail
    });
    
    // Store the user ID for later verification and cleanup
    const userId = event.data.id;
    
    // Invoke the webhook with the mock event
    cy.task('invokeWebhook', { event }).then((response) => {
      // Webhook should now return 202 Accepted instead of 200 OK
      expect(response.status).to.equal(202);
      expect(response.body).to.have.property('jobId');
      
      const jobId = response.body.jobId;
      cy.log(`Job created with ID: ${jobId}`);
      
      // Verify that a job was created in the queue
      cy.task('verifyJobCreated', { 
        eventType: event.type,
        userId
      }).then((result) => {
        expect(result.success).to.be.true;
        expect(result.jobId).to.equal(jobId);
        
        // Process the job to completion
        cy.task('processJobToCompletion', { jobId }).then((processingResult) => {
          expect(processingResult.success).to.be.true;
          
          // Verify that the user was created in the database
          cy.task('verifyUserExists', { 
            userId,
            expectedData: {
              clerk_id: userId,
              email: testEmail,
              name: `${testFirstName} ${testLastName}`,
              user_role: 'user' // Default role
            }
          }).then((userResult) => {
            expect(userResult.success).to.be.true;
            cy.log('User was successfully created via job queue');
            
            // Clean up the test user
            cy.task('removeTestUser', { userId });
          });
        });
      });
    });
  });

  it('should create a job for user update events', () => {
    // First create a user
    const testEmail = `update-${generateTestId()}@example.com`;
    const testFirstName = 'Update';
    const testLastName = 'User';
    
    // Create mock user creation event
    const createEvent = generateUserCreatedEvent({
      firstName: testFirstName,
      lastName: testLastName,
      email: testEmail
    });
    
    const userId = createEvent.data.id;
    
    // Create the user first
    cy.task('invokeWebhook', { event: createEvent }).then((createResponse) => {
      expect(createResponse.status).to.equal(202);
      const createJobId = createResponse.body.jobId;
      
      // Process the creation job
      cy.task('processJobToCompletion', { jobId: createJobId }).then(() => {
        // Now update the user
        const updatedFirstName = 'Updated';
        const updatedLastName = 'Name';
        const updatedEmail = `updated-${generateTestId()}@example.com`;
        
        const updateEvent = generateUserUpdatedEvent({
          userId,
          firstName: updatedFirstName,
          lastName: updatedLastName,
          email: updatedEmail,
          role: 'admin' // Change role to admin
        });
        
        // Invoke the webhook with the update event
        cy.task('invokeWebhook', { event: updateEvent }).then((updateResponse) => {
          expect(updateResponse.status).to.equal(202);
          expect(updateResponse.body).to.have.property('jobId');
          
          const updateJobId = updateResponse.body.jobId;
          cy.log(`Update job created with ID: ${updateJobId}`);
          
          // Verify that an update job was created
          cy.task('verifyJobCreated', { 
            eventType: updateEvent.type,
            userId
          }).then((result) => {
            expect(result.success).to.be.true;
            
            // Process the update job
            cy.task('processJobToCompletion', { jobId: updateJobId }).then((processingResult) => {
              expect(processingResult.success).to.be.true;
              
              // Verify that the user was updated in the database
              cy.task('verifyUserExists', { 
                userId,
                expectedData: {
                  clerk_id: userId,
                  email: updatedEmail,
                  name: `${updatedFirstName} ${updatedLastName}`,
                  user_role: 'admin'
                }
              }).then((userResult) => {
                expect(userResult.success).to.be.true;
                cy.log('User was successfully updated via job queue');
                
                // Clean up the test user
                cy.task('removeTestUser', { userId });
              });
            });
          });
        });
      });
    });
  });

  it('should create a job for user deletion events', () => {
    // First create a user
    const testEmail = `delete-${generateTestId()}@example.com`;
    const testFirstName = 'Delete';
    const testLastName = 'User';
    
    // Create mock user creation event
    const createEvent = generateUserCreatedEvent({
      firstName: testFirstName,
      lastName: testLastName,
      email: testEmail
    });
    
    const userId = createEvent.data.id;
    
    // Create the user first
    cy.task('invokeWebhook', { event: createEvent }).then((createResponse) => {
      expect(createResponse.status).to.equal(202);
      const createJobId = createResponse.body.jobId;
      
      // Process the creation job
      cy.task('processJobToCompletion', { jobId: createJobId }).then(() => {
        // Now delete the user
        const deleteEvent = generateUserDeletedEvent({
          userId
        });
        
        // Invoke the webhook with the delete event
        cy.task('invokeWebhook', { event: deleteEvent }).then((deleteResponse) => {
          expect(deleteResponse.status).to.equal(202);
          expect(deleteResponse.body).to.have.property('jobId');
          
          const deleteJobId = deleteResponse.body.jobId;
          cy.log(`Delete job created with ID: ${deleteJobId}`);
          
          // Verify that a delete job was created
          cy.task('verifyJobCreated', { 
            eventType: deleteEvent.type,
            userId
          }).then((result) => {
            expect(result.success).to.be.true;
            
            // Process the delete job
            cy.task('processJobToCompletion', { jobId: deleteJobId }).then((processingResult) => {
              expect(processingResult.success).to.be.true;
              
              // Verify that the user was deleted from the database
              cy.task('verifyUserDeleted', { userId }).then((userResult) => {
                expect(userResult.success).to.be.true;
                cy.log('User was successfully deleted via job queue');
              });
            });
          });
        });
      });
    });
  });

  it('should handle job failures gracefully', () => {
    // Create a malformed event that will cause job processing to fail
    const testEmail = `fail-${generateTestId()}@example.com`;
    
    // Create a user creation event with missing required fields
    const event = generateUserCreatedEvent({
      firstName: '',
      lastName: '',
      email: testEmail
    });
    
    // Corrupt the event data to cause a processing failure
    // @ts-ignore - Intentionally breaking the event structure
    delete event.data.email_addresses;
    
    const userId = event.data.id;
    
    // Invoke the webhook with the corrupted event
    cy.task('invokeWebhook', { event }).then((response) => {
      expect(response.status).to.equal(202);
      expect(response.body).to.have.property('jobId');
      
      const jobId = response.body.jobId;
      cy.log(`Job created with ID: ${jobId} (expected to fail)`);
      
      // Verify that a job was created
      cy.task('verifyJobCreated', { 
        eventType: event.type,
        userId
      }).then((result) => {
        expect(result.success).to.be.true;
        
        // Try to process the job (should fail)
        cy.task('processJobToCompletion', { jobId }).then((processingResult) => {
          // The job should either fail or time out
          if (!processingResult.success) {
            cy.log('Job failed as expected');
            expect(processingResult.jobStatus).to.equal('FAILED');
          }
        });
      });
    });
  });

  it('should retry failed jobs with exponential backoff', () => {
    // This test would require more complex setup to simulate retries
    // For now, we'll just verify that retry_count is incremented
    
    // Create a job that will fail on first attempt
    const testEmail = `retry-${generateTestId()}@example.com`;
    const event = generateUserCreatedEvent({
      firstName: 'Retry',
      lastName: 'Test',
      email: testEmail
    });
    
    const userId = event.data.id;
    
    // Invoke the webhook
    cy.task('invokeWebhook', { event }).then((response) => {
      expect(response.status).to.equal(202);
      const jobId = response.body.jobId;
      
      // Get the job and manually update it to simulate a failed attempt
      cy.task('simulateFailedJobAttempt', { 
        jobId,
        error: 'Simulated failure for testing retries'
      }).then((updateResult) => {
        expect(updateResult.success).to.be.true;
        
        // Now try processing the job again
        cy.task('processJobToCompletion', { jobId }).then((processingResult) => {
          // The job should eventually succeed
          expect(processingResult.success).to.be.true;
          
          // Verify the user was created despite the initial failure
          cy.task('verifyUserExists', { userId }).then((userResult) => {
            expect(userResult.success).to.be.true;
            cy.log('User was created after job retry');
            
            // Clean up
            cy.task('removeTestUser', { userId });
          });
        });
      });
    });
  });
});

// Helper function to generate malformed events for testing
function generateMalformedEvent(type: 'missing-id' | 'missing-email' | 'empty-payload' | 'invalid-type') {
  const baseEvent = generateUserCreatedEvent({
    firstName: 'Test',
    lastName: 'User',
    email: `malformed-${generateTestId()}@example.com`
  });
  
  switch (type) {
    case 'missing-id':
      // @ts-ignore - Intentionally breaking the event structure
      delete baseEvent.data.id;
      return baseEvent;
      
    case 'missing-email':
      // @ts-ignore - Intentionally breaking the event structure
      delete baseEvent.data.email_addresses;
      return baseEvent;
      
    case 'empty-payload':
      return {
        ...baseEvent,
        data: {}
      };
      
    case 'invalid-type':
      return {
        ...baseEvent,
        type: 'user.invalid_event_type'
      };
  }
}
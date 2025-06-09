/**
 * User Lifecycle Webhook Tests
 * 
 * This file contains end-to-end tests for the complete user lifecycle,
 * testing creation, update, and deletion in sequence using the job queue system.
 */

import { 
  generateUserCreatedEvent,
  generateUserUpdatedEvent,
  generateUserDeletedEvent,
  generateTestId
} from '../../src/tests/utils/clerk-webhook-test-utils';
import { 
  verifyUserExists,
  verifyUserDeleted
} from '../../src/tests/utils/webhook-db-verifier';
import { 
  removeTestUser,
  removeAllTestUsers
} from '../../src/tests/utils/webhook-test-cleanup';
import {
  JOB_TYPES
} from '../../src/tests/utils/webhook-job-verifier';

describe('User Lifecycle Webhook Tests', () => {
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

  it('should handle complete user lifecycle from creation to deletion', () => {
    // Generate test data for a user
    const testId = generateTestId();
    const initialEmail = `lifecycle-${testId}@example.com`;
    const initialFirstName = 'Lifecycle';
    const initialLastName = 'Test';
    const initialRole = 'user';
    
    // Step 1: Create the user
    const createEvent = generateUserCreatedEvent({
      firstName: initialFirstName,
      lastName: initialLastName,
      email: initialEmail,
      role: initialRole
    });
    
    const userId = createEvent.data.id;
    cy.log(`Testing lifecycle for user ID: ${userId}`);
    
    // Invoke the webhook with the creation event
    cy.task('invokeWebhook', { event: createEvent }).then((createResponse) => {
      expect(createResponse.status).to.equal(202);
      expect(createResponse.body).to.have.property('jobId');
      
      const createJobId = createResponse.body.jobId;
      cy.log(`User creation job queued with ID: ${createJobId}`);
      
      // Process the creation job
      cy.task('processJobToCompletion', { jobId: createJobId }).then((createResult) => {
        expect(createResult.success).to.be.true;
        cy.log('User creation job completed successfully');
        
        // Verify the user was created correctly
        cy.task('verifyUserExists', { 
          userId,
          expectedData: {
            clerk_id: userId,
            email: initialEmail,
            name: `${initialFirstName} ${initialLastName}`,
            user_role: initialRole
          }
        }).then((verifyResult) => {
          expect(verifyResult.success).to.be.true;
          cy.log('User was created successfully');
          
          // Step 2: Update the user
          const updatedEmail = `updated-${testId}@example.com`;
          const updatedFirstName = 'Updated';
          const updatedLastName = 'User';
          const updatedRole = 'caregiver';
          
          const updateEvent = generateUserUpdatedEvent({
            userId,
            firstName: updatedFirstName,
            lastName: updatedLastName,
            email: updatedEmail,
            role: updatedRole
          });
          
          // Invoke the webhook with the update event
          cy.task('invokeWebhook', { event: updateEvent }).then((updateResponse) => {
            expect(updateResponse.status).to.equal(202);
            expect(updateResponse.body).to.have.property('jobId');
            
            const updateJobId = updateResponse.body.jobId;
            cy.log(`User update job queued with ID: ${updateJobId}`);
            
            // Process the update job
            cy.task('processJobToCompletion', { jobId: updateJobId }).then((updateResult) => {
              expect(updateResult.success).to.be.true;
              cy.log('User update job completed successfully');
              
              // Verify the user was updated correctly
              cy.task('verifyUserExists', { 
                userId,
                expectedData: {
                  clerk_id: userId,
                  email: updatedEmail,
                  name: `${updatedFirstName} ${updatedLastName}`,
                  user_role: updatedRole
                }
              }).then((verifyUpdateResult) => {
                expect(verifyUpdateResult.success).to.be.true;
                cy.log('User was updated successfully');
                
                // Step 3: Delete the user
                const deleteEvent = generateUserDeletedEvent({
                  userId
                });
                
                // Invoke the webhook with the delete event
                cy.task('invokeWebhook', { event: deleteEvent }).then((deleteResponse) => {
                  expect(deleteResponse.status).to.equal(202);
                  expect(deleteResponse.body).to.have.property('jobId');
                  
                  const deleteJobId = deleteResponse.body.jobId;
                  cy.log(`User deletion job queued with ID: ${deleteJobId}`);
                  
                  // Process the deletion job
                  cy.task('processJobToCompletion', { jobId: deleteJobId }).then((deleteResult) => {
                    expect(deleteResult.success).to.be.true;
                    cy.log('User deletion job completed successfully');
                    
                    // Verify the user was deleted
                    cy.task('verifyUserDeleted', { userId }).then((verifyDeleteResult) => {
                      expect(verifyDeleteResult.success).to.be.true;
                      cy.log('User was deleted successfully');
                    });
                  });
                });
              });
            });
          });
        });
      });
    });
  });

  it('should handle multiple role changes throughout user lifecycle', () => {
    // Generate test data for a user
    const testId = generateTestId();
    const email = `roles-${testId}@example.com`;
    const firstName = 'Role';
    const lastName = 'Tester';
    
    // Define a sequence of role changes to test
    const roleSequence = [
      'user',      // Initial role
      'admin',     // First update
      'caregiver', // Second update
      'user'       // Final update
    ];
    
    // Step 1: Create the user with initial role
    const createEvent = generateUserCreatedEvent({
      firstName,
      lastName,
      email,
      role: roleSequence[0]
    });
    
    const userId = createEvent.data.id;
    cy.log(`Testing role changes for user ID: ${userId}`);
    
    // Invoke the webhook with the creation event
    cy.task('invokeWebhook', { event: createEvent }).then((createResponse) => {
      expect(createResponse.status).to.equal(202);
      const createJobId = createResponse.body.jobId;
      
      // Process the creation job
      cy.task('processJobToCompletion', { jobId: createJobId }).then(() => {
        // Verify initial role
        cy.task('verifyUserExists', { 
          userId,
          expectedData: {
            clerk_id: userId,
            user_role: roleSequence[0]
          }
        }).then((initialVerify) => {
          expect(initialVerify.success).to.be.true;
          cy.log(`User created with initial role: ${roleSequence[0]}`);
          
          // Function to update role and verify
          const updateAndVerifyRole = (index) => {
            if (index >= roleSequence.length) {
              // All roles tested, delete the user
              const deleteEvent = generateUserDeletedEvent({ userId });
              
              cy.task('invokeWebhook', { event: deleteEvent }).then((deleteResponse) => {
                const deleteJobId = deleteResponse.body.jobId;
                cy.task('processJobToCompletion', { jobId: deleteJobId });
              });
              
              return;
            }
            
            const newRole = roleSequence[index];
            cy.log(`Updating user to role: ${newRole}`);
            
            const updateEvent = generateUserUpdatedEvent({
              userId,
              firstName,
              lastName,
              email,
              role: newRole
            });
            
            cy.task('invokeWebhook', { event: updateEvent }).then((updateResponse) => {
              const updateJobId = updateResponse.body.jobId;
              
              cy.task('processJobToCompletion', { jobId: updateJobId }).then(() => {
                cy.task('verifyUserExists', { 
                  userId,
                  expectedData: {
                    clerk_id: userId,
                    user_role: newRole
                  }
                }).then((verifyResult) => {
                  expect(verifyResult.success).to.be.true;
                  cy.log(`Successfully verified role change to: ${newRole}`);
                  
                  // Process next role in sequence
                  updateAndVerifyRole(index + 1);
                });
              });
            });
          };
          
          // Start role update sequence (starting from index 1 since 0 is the initial role)
          updateAndVerifyRole(1);
        });
      });
    });
  });

  it('should maintain data consistency through the user lifecycle', () => {
    // This test focuses on data integrity throughout the lifecycle
    const testId = generateTestId();
    const initialEmail = `integrity-${testId}@example.com`;
    const initialName = 'Data Integrity Test';
    
    // Create user with specific data points to track
    const createEvent = generateUserCreatedEvent({
      firstName: 'Data',
      lastName: 'Integrity',
      email: initialEmail
    });
    
    // Add some custom metadata to track
    createEvent.data.public_metadata = {
      test_value: 'initial',
      created_at: new Date().toISOString(),
      test_id: testId
    };
    
    const userId = createEvent.data.id;
    
    // Create the user
    cy.task('invokeWebhook', { event: createEvent }).then((response) => {
      const jobId = response.body.jobId;
      cy.task('processJobToCompletion', { jobId }).then(() => {
        
        // Make a partial update (only update email)
        const partialUpdateEvent = generateUserUpdatedEvent({
          userId,
          email: `updated-${testId}@example.com`,
          // Don't change name or other fields
        });
        
        // Update metadata partially
        partialUpdateEvent.data.public_metadata = {
          ...createEvent.data.public_metadata,
          test_value: 'updated',
          updated_at: new Date().toISOString()
        };
        
        // Process the partial update
        cy.task('invokeWebhook', { event: partialUpdateEvent }).then((updateResponse) => {
          const updateJobId = updateResponse.body.jobId;
          cy.task('processJobToCompletion', { jobId: updateJobId }).then(() => {
            
            // Verify that only specified fields were updated
            cy.task('verifyUserExists', { 
              userId,
              expectedData: {
                clerk_id: userId,
                email: `updated-${testId}@example.com`,
                name: initialName // Name should remain unchanged
              }
            }).then((verifyResult) => {
              expect(verifyResult.success).to.be.true;
              
              // Clean up
              const deleteEvent = generateUserDeletedEvent({ userId });
              cy.task('invokeWebhook', { event: deleteEvent }).then((deleteResponse) => {
                const deleteJobId = deleteResponse.body.jobId;
                cy.task('processJobToCompletion', { jobId: deleteJobId });
              });
            });
          });
        });
      });
    });
  });
});
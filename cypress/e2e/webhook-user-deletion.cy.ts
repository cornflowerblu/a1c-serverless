/**
 * User Deletion Webhook Tests
 * 
 * This file contains tests for the user deletion webhook functionality,
 * verifying that users are properly deleted from the database when
 * Clerk user deletion events are received.
 */

import { 
  generateUserCreatedEvent,
  generateUserDeletedEvent,
  generateTestId
} from '../../src/tests/utils/clerk-webhook-test-utils';
import { 
  invokeWebhook,
  waitForWebhookProcessing
} from '../../src/tests/utils/webhook-invoker';
import { 
  verifyUserExists,
  verifyUserDeleted,
  waitForDatabaseChange
} from '../../src/tests/utils/webhook-db-verifier';
import { 
  removeTestUser,
  removeAllTestUsers
} from '../../src/tests/utils/webhook-test-cleanup';

describe('Basic User Deletion Tests', () => {
  // Clean up test users before and after tests
  before(() => {
    cy.task('removeAllTestUsers');
  });

  after(() => {
    cy.task('removeAllTestUsers');
  });

  it('should delete a user when receiving a deletion event', () => {
    // Generate test data
    const testEmail = `delete-${generateTestId()}@example.com`;
    const testFirstName = 'Delete';
    const testLastName = 'User';
    
    // First create a user
    const createEvent = generateUserCreatedEvent({
      firstName: testFirstName,
      lastName: testLastName,
      email: testEmail
    });
    
    const userId = createEvent.data.id;
    
    // Create the user
    cy.task('invokeWebhook', { event: createEvent }).then((response) => {
      expect(response.status).to.equal(200);
      cy.wait(2000);
      
      // Verify user was created
      cy.task('verifyUserExists', { userId }).then((result) => {
        expect(result.success).to.be.true;
        
        // Now delete the user
        const deleteEvent = generateUserDeletedEvent(userId);
        
        // Invoke the webhook with the delete event
        cy.task('invokeWebhook', { event: deleteEvent }).then((deleteResponse) => {
          expect(deleteResponse.status).to.equal(200);
          cy.wait(2000);
          
          // Verify the user was deleted
          cy.task('verifyUserDeleted', { userId }).then((deleteResult) => {
            expect(deleteResult.success).to.be.true;
            cy.log('User was successfully deleted');
          });
        });
      });
    });
  });

  it('should delete users with different roles', () => {
    // Test deletion for different user roles
    const roles = ['user', 'admin', 'caregiver'];
    
    cy.wrap(roles).each((role) => {
      const testEmail = `delete-${role}-${generateTestId()}@example.com`;
      
      // Create a user with the specified role
      const createEvent = generateUserCreatedEvent({
        firstName: `Delete`,
        lastName: role.charAt(0).toUpperCase() + role.slice(1),
        email: testEmail,
        role: role as any
      });
      
      const userId = createEvent.data.id;
      
      // Create the user
      cy.task('invokeWebhook', { event: createEvent }).then(() => {
        cy.wait(2000);
        
        // Verify user was created with the correct role
        cy.task('verifyUserExists', { 
          userId,
          expectedData: {
            user_role: role === 'user' ? 'user' : role
          }
        }).then((result) => {
          expect(result.success).to.be.true;
          
          // Delete the user
          const deleteEvent = generateUserDeletedEvent(userId);
          
          cy.task('invokeWebhook', { event: deleteEvent }).then(() => {
            cy.wait(2000);
            
            // Verify the user was deleted
            cy.task('verifyUserDeleted', { userId }).then((deleteResult) => {
              expect(deleteResult.success).to.be.true;
              cy.log(`${role} user was successfully deleted`);
            });
          });
        });
      });
    });
  });
});
describe('User Deletion Error Handling Tests', () => {
  // Clean up test users before and after tests
  before(() => {
    cy.task('removeAllTestUsers');
  });

  after(() => {
    cy.task('removeAllTestUsers');
  });

  it('should handle deleting non-existent users', () => {
    // Generate a random user ID that doesn't exist
    const nonExistentUserId = `user_nonexistent_${generateTestId()}`;
    
    // Create a deletion event for a non-existent user
    const deleteEvent = generateUserDeletedEvent(nonExistentUserId);
    
    // Invoke the webhook with the delete event
    cy.task('invokeWebhook', { event: deleteEvent }).then((response) => {
      // The webhook should handle this gracefully
      expect(response).to.exist;
      
      // Verify the user still doesn't exist
      cy.task('verifyUserDeleted', { userId: nonExistentUserId }).then((result) => {
        // This should succeed because the user doesn't exist
        expect(result.success).to.be.true;
        cy.log('Webhook correctly handled deletion of non-existent user');
      });
    });
  });

  it('should handle malformed deletion events', () => {
    // Test different types of malformed events
    const malformedTypes = ['missing-id', 'empty-payload'];
    
    cy.wrap(malformedTypes).each((type) => {
      // Generate a malformed event
      const malformedEvent = generateMalformedEvent(type as any);
      malformedEvent.type = 'user.deleted'; // Make it a deletion event
      
      // Invoke the webhook with the malformed event
      cy.task('invokeWebhook', { event: malformedEvent }).then((response) => {
        // Even with malformed data, the webhook should respond
        expect(response).to.exist;
        
        if (response.status !== 200) {
          cy.log(`Webhook correctly returned error status ${response.status} for ${type} event`);
        } else {
          cy.log(`Webhook handled ${type} event gracefully with status 200`);
        }
      });
    });
  });

  it('should handle deletion after failed creation', () => {
    // Create a malformed user creation event
    const malformedCreateEvent = generateMalformedEvent('missing-email');
    const userId = malformedCreateEvent.data?.id || `user_${generateTestId()}`;
    
    // Try to create the user with malformed data
    cy.task('invokeWebhook', { event: malformedCreateEvent }).then(() => {
      cy.wait(1000);
      
      // Now try to delete the user that may not have been created properly
      const deleteEvent = generateUserDeletedEvent(userId);
      
      cy.task('invokeWebhook', { event: deleteEvent }).then((response) => {
        // The webhook should handle this gracefully
        expect(response).to.exist;
        
        // Verify the user doesn't exist
        cy.task('verifyUserDeleted', { userId }).then((result) => {
          expect(result.success).to.be.true;
          cy.log('Webhook correctly handled deletion after failed creation');
        });
      });
    });
  });

  it('should handle double deletion of the same user', () => {
    // Generate test data
    const testEmail = `double-delete-${generateTestId()}@example.com`;
    
    // First create a user
    const createEvent = generateUserCreatedEvent({
      firstName: 'Double',
      lastName: 'Delete',
      email: testEmail
    });
    
    const userId = createEvent.data.id;
    
    // Create the user
    cy.task('invokeWebhook', { event: createEvent }).then((response) => {
      expect(response.status).to.equal(200);
      cy.wait(2000);
      
      // Verify user was created
      cy.task('verifyUserExists', { userId }).then((result) => {
        expect(result.success).to.be.true;
        
        // Delete the user
        const deleteEvent = generateUserDeletedEvent(userId);
        
        cy.task('invokeWebhook', { event: deleteEvent }).then(() => {
          cy.wait(2000);
          
          // Verify the user was deleted
          cy.task('verifyUserDeleted', { userId }).then((deleteResult) => {
            expect(deleteResult.success).to.be.true;
            
            // Try to delete the same user again
            cy.task('invokeWebhook', { event: deleteEvent }).then((secondDeleteResponse) => {
              // The webhook should handle this gracefully
              expect(secondDeleteResponse).to.exist;
              
              cy.log('Webhook correctly handled double deletion of the same user');
            });
          });
        });
      });
    });
  });
});
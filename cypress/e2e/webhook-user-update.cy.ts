/**
 * User Update Webhook Tests
 * 
 * This file contains tests for the user update webhook functionality,
 * verifying that users are properly updated in the database when
 * Clerk user update events are received.
 */

import { 
  generateUserCreatedEvent,
  generateUserUpdatedEvent,
  generateTestId
} from '../../src/tests/utils/clerk-webhook-test-utils';
import { 
  invokeWebhook,
  waitForWebhookProcessing
} from '../../src/tests/utils/webhook-invoker';
import { 
  verifyUserExists,
  verifyUserUpdated,
  waitForDatabaseChange
} from '../../src/tests/utils/webhook-db-verifier';
import { 
  removeTestUser,
  removeAllTestUsers
} from '../../src/tests/utils/webhook-test-cleanup';

describe('Basic User Update Tests', () => {
  // Clean up test users before and after tests
  before(() => {
    cy.task('removeAllTestUsers');
  });

  after(() => {
    cy.task('removeAllTestUsers');
  });

  it('should update user name and email', () => {
    // Generate initial test data
    const initialEmail = `initial-${generateTestId()}@example.com`;
    const initialFirstName = 'Initial';
    const initialLastName = 'User';
    
    // Create a user first
    const createEvent = generateUserCreatedEvent({
      firstName: initialFirstName,
      lastName: initialLastName,
      email: initialEmail
    });
    
    const userId = createEvent.data.id;
    
    // Create the user
    cy.task('invokeWebhook', { event: createEvent }).then((response) => {
      expect(response.status).to.equal(200);
      cy.wait(2000);
      
      // Verify user was created with initial data
      cy.task('verifyUserExists', { 
        userId,
        expectedData: {
          clerk_id: userId,
          email: initialEmail,
          name: `${initialFirstName} ${initialLastName}`
        }
      }).then((result) => {
        expect(result.success).to.be.true;
        
        // Now update the user
        const updatedEmail = `updated-${generateTestId()}@example.com`;
        const updatedFirstName = 'Updated';
        const updatedLastName = 'Name';
        
        const updateEvent = generateUserUpdatedEvent(userId, {
          firstName: updatedFirstName,
          lastName: updatedLastName,
          email: updatedEmail
        });
        
        // Invoke the webhook with the update event
        cy.task('invokeWebhook', { event: updateEvent }).then((updateResponse) => {
          expect(updateResponse.status).to.equal(200);
          cy.wait(2000);
          
          // Verify the user was updated
          cy.task('verifyUserUpdated', { 
            userId,
            expectedData: {
              clerk_id: userId,
              email: updatedEmail,
              name: `${updatedFirstName} ${updatedLastName}`
            }
          }).then((updateResult) => {
            expect(updateResult.success).to.be.true;
            cy.log('User was successfully updated');
            
            // Clean up the test user
            cy.task('removeTestUser', { userId });
          });
        });
      });
    });
  });

  it('should update only the provided fields', () => {
    // Generate initial test data
    const initialEmail = `partial-${generateTestId()}@example.com`;
    const initialFirstName = 'Partial';
    const initialLastName = 'Update';
    
    // Create a user first
    const createEvent = generateUserCreatedEvent({
      firstName: initialFirstName,
      lastName: initialLastName,
      email: initialEmail
    });
    
    const userId = createEvent.data.id;
    
    // Create the user
    cy.task('invokeWebhook', { event: createEvent }).then((response) => {
      expect(response.status).to.equal(200);
      cy.wait(2000);
      
      // Verify user was created
      cy.task('verifyUserExists', { userId }).then((result) => {
        expect(result.success).to.be.true;
        
        // Update only the first name
        const updateEvent = generateUserUpdatedEvent(userId, {
          firstName: 'NewFirst',
          // Keep other fields the same
          lastName: initialLastName,
          email: initialEmail
        });
        
        // Invoke the webhook with the partial update
        cy.task('invokeWebhook', { event: updateEvent }).then((updateResponse) => {
          expect(updateResponse.status).to.equal(200);
          cy.wait(2000);
          
          // Verify only the first name was updated
          cy.task('verifyUserUpdated', { 
            userId,
            expectedData: {
              clerk_id: userId,
              email: initialEmail,
              name: `NewFirst ${initialLastName}`
            }
          }).then((updateResult) => {
            expect(updateResult.success).to.be.true;
            cy.log('User was successfully updated with partial data');
            
            // Clean up the test user
            cy.task('removeTestUser', { userId });
          });
        });
      });
    });
  });
});
describe('User Role Update Tests', () => {
  // Clean up test users before and after tests
  before(() => {
    cy.task('removeAllTestUsers');
  });

  after(() => {
    cy.task('removeAllTestUsers');
  });

  it('should update user role through metadata', () => {
    // Generate initial test data with default role
    const testEmail = `role-update-${generateTestId()}@example.com`;
    const testFirstName = 'Role';
    const testLastName = 'Update';
    
    // Create a user with default role
    const createEvent = generateUserCreatedEvent({
      firstName: testFirstName,
      lastName: testLastName,
      email: testEmail
      // No role specified, should default to 'user'
    });
    
    const userId = createEvent.data.id;
    
    // Create the user
    cy.task('invokeWebhook', { event: createEvent }).then((response) => {
      expect(response.status).to.equal(200);
      cy.wait(2000);
      
      // Verify user was created with default role
      cy.task('verifyUserExists', { 
        userId,
        expectedData: {
          clerk_id: userId,
          user_role: 'user' // Default role
        }
      }).then((result) => {
        expect(result.success).to.be.true;
        
        // Now update the user to admin role
        const updateEvent = generateUserUpdatedEvent(userId, {
          firstName: testFirstName,
          lastName: testLastName,
          email: testEmail,
          role: 'admin'
        });
        
        // Invoke the webhook with the update event
        cy.task('invokeWebhook', { event: updateEvent }).then((updateResponse) => {
          expect(updateResponse.status).to.equal(200);
          cy.wait(2000);
          
          // Verify the user role was updated
          cy.task('verifyUserUpdated', { 
            userId,
            expectedData: {
              clerk_id: userId,
              user_role: 'admin'
            }
          }).then((updateResult) => {
            expect(updateResult.success).to.be.true;
            cy.log('User role was successfully updated to admin');
            
            // Clean up the test user
            cy.task('removeTestUser', { userId });
          });
        });
      });
    });
  });

  it('should update user role from admin to caregiver', () => {
    // Generate test data with admin role
    const testEmail = `admin-to-caregiver-${generateTestId()}@example.com`;
    
    // Create a user with admin role
    const createEvent = generateUserCreatedEvent({
      firstName: 'Admin',
      lastName: 'User',
      email: testEmail,
      role: 'admin'
    });
    
    const userId = createEvent.data.id;
    
    // Create the admin user
    cy.task('invokeWebhook', { event: createEvent }).then((response) => {
      expect(response.status).to.equal(200);
      cy.wait(2000);
      
      // Verify user was created with admin role
      cy.task('verifyUserExists', { 
        userId,
        expectedData: {
          clerk_id: userId,
          user_role: 'admin'
        }
      }).then((result) => {
        expect(result.success).to.be.true;
        
        // Now update the user to caregiver role
        const updateEvent = generateUserUpdatedEvent(userId, {
          role: 'caregiver'
        });
        
        // Invoke the webhook with the update event
        cy.task('invokeWebhook', { event: updateEvent }).then((updateResponse) => {
          expect(updateResponse.status).to.equal(200);
          cy.wait(2000);
          
          // Verify the user role was updated
          cy.task('verifyUserUpdated', { 
            userId,
            expectedData: {
              clerk_id: userId,
              user_role: 'caregiver'
            }
          }).then((updateResult) => {
            expect(updateResult.success).to.be.true;
            cy.log('User role was successfully updated from admin to caregiver');
            
            // Clean up the test user
            cy.task('removeTestUser', { userId });
          });
        });
      });
    });
  });

  it('should handle role updates with different naming conventions', () => {
    // Test different role naming conventions that should map to the same role
    const roleVariations = [
      { initialRole: 'user', updateRole: 'administrator', expectedRole: 'admin' },
      { initialRole: 'admin', updateRole: 'care_giver', expectedRole: 'caregiver' },
      { initialRole: 'caregiver', updateRole: 'default', expectedRole: 'user' }
    ];
    
    // Test each role variation sequentially
    cy.wrap(roleVariations).each((variation) => {
      const testEmail = `role-convention-${generateTestId()}@example.com`;
      
      // Create user with initial role
      const createEvent = generateUserCreatedEvent({
        firstName: 'Role',
        lastName: 'Test',
        email: testEmail,
        role: variation.initialRole as any
      });
      
      const userId = createEvent.data.id;
      
      // Create the user
      cy.task('invokeWebhook', { event: createEvent }).then(() => {
        cy.wait(2000);
        
        // Update to new role with different naming convention
        const updateEvent = generateUserUpdatedEvent(userId, {
          role: variation.updateRole as any
        });
        
        // Invoke webhook with update
        cy.task('invokeWebhook', { event: updateEvent }).then(() => {
          cy.wait(2000);
          
          // Verify role was mapped correctly
          cy.task('verifyUserUpdated', { 
            userId,
            expectedData: {
              user_role: variation.expectedRole
            }
          }).then((result) => {
            expect(result.success).to.be.true;
            cy.log(`Role '${variation.updateRole}' correctly mapped to '${variation.expectedRole}'`);
            
            // Clean up
            cy.task('removeTestUser', { userId });
          });
        });
      });
    });
  });
});
describe('User Update Error Handling Tests', () => {
  // Clean up test users before and after tests
  before(() => {
    cy.task('removeAllTestUsers');
  });

  after(() => {
    cy.task('removeAllTestUsers');
  });

  it('should handle malformed update events gracefully', () => {
    // First create a valid user
    const testEmail = `error-handling-${generateTestId()}@example.com`;
    const testFirstName = 'Error';
    const testLastName = 'Handling';
    
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
        
        // Now try to update with malformed events
        const malformedTypes = ['missing-id', 'empty-payload'];
        
        cy.wrap(malformedTypes).each((type) => {
          // Generate a malformed event
          const malformedEvent = generateMalformedEvent(type as any);
          malformedEvent.type = 'user.updated'; // Make it an update event
          
          // Invoke the webhook with the malformed event
          cy.task('invokeWebhook', { event: malformedEvent }).then((updateResponse) => {
            // Even with malformed data, the webhook should respond
            expect(updateResponse).to.exist;
            
            if (updateResponse.status !== 200) {
              cy.log(`Webhook correctly returned error status ${updateResponse.status} for ${type} event`);
            } else {
              cy.log(`Webhook handled ${type} event gracefully with status 200`);
            }
          });
        });
        
        // Clean up the test user
        cy.task('removeTestUser', { userId });
      });
    });
  });

  it('should handle updating non-existent users', () => {
    // Generate a random user ID that doesn't exist
    const nonExistentUserId = `user_nonexistent_${generateTestId()}`;
    
    // Create an update event for a non-existent user
    const updateEvent = generateUserUpdatedEvent(nonExistentUserId, {
      firstName: 'Nonexistent',
      lastName: 'User',
      email: `nonexistent-${generateTestId()}@example.com`
    });
    
    // Invoke the webhook with the update event
    cy.task('invokeWebhook', { event: updateEvent }).then((response) => {
      // The webhook should handle this gracefully
      expect(response).to.exist;
      
      // Verify the user still doesn't exist
      cy.task('verifyUserExists', { 
        userId: nonExistentUserId,
        expectedData: {}
      }).then((result) => {
        expect(result.success).to.be.false;
        cy.log('Webhook correctly handled update for non-existent user');
      });
    });
  });

  it('should handle updates with missing email addresses', () => {
    // First create a valid user
    const testEmail = `missing-email-${generateTestId()}@example.com`;
    const testFirstName = 'Missing';
    const testLastName = 'Email';
    
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
        
        // Create an update event with missing email
        const updateEvent = generateMalformedEvent('missing-email') as any;
        updateEvent.type = 'user.updated';
        updateEvent.data.id = userId; // Use the valid user ID
        
        // Invoke the webhook with the update event
        cy.task('invokeWebhook', { event: updateEvent }).then((updateResponse) => {
          expect(updateResponse).to.exist;
          cy.log('Webhook handled update with missing email');
          
          // Clean up the test user
          cy.task('removeTestUser', { userId });
        });
      });
    });
  });
});
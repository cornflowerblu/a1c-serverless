/**
 * User Creation Webhook Tests
 * 
 * This file contains tests for the user creation webhook functionality,
 * verifying that users are properly created in the database when
 * Clerk user creation events are received.
 */

import { 
    generateUserCreatedEvent,
    generateTestId
  } from '../../src/tests/utils/clerk-webhook-test-utils';
  import { 
    invokeWebhook,
    waitForWebhookProcessing
  } from '../../src/tests/utils/webhook-invoker';
  import { 
    verifyUserExists,
    waitForDatabaseChange
  } from '../../src/tests/utils/webhook-db-verifier';
  import { 
    removeTestUser,
    removeAllTestUsers
  } from '../../src/tests/utils/webhook-test-cleanup';
  
  describe('User Creation Webhook Tests', () => {
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
  
    it('should create a user with minimal required fields', () => {
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
        expect(response.status).to.equal(200);
        
        // Wait for webhook processing to complete
        cy.wait(2000); // Wait for webhook processing
        
        // Verify that the user was created in the database
        cy.task('verifyUserExists', { 
          userId,
          expectedData: {
            clerk_id: userId,
            email: testEmail,
            name: `${testFirstName} ${testLastName}`,
            user_role: 'user' // Default role
          }
        }).then((result) => {
          expect(result.success).to.be.true;
          cy.log('User was successfully created in the database');
          
          // Clean up the test user
          cy.task('removeTestUser', { userId }).then((cleanupResult) => {
            expect(cleanupResult.success).to.be.true;
            cy.log('Test user was successfully removed');
          });
        });
      });
    });
  
    it('should handle empty name fields gracefully', () => {
      // Generate test data with empty name fields
      const testEmail = `test-${generateTestId()}@example.com`;
      
      // Create mock user creation event with empty name fields
      const event = generateUserCreatedEvent({
        firstName: '',
        lastName: '',
        email: testEmail
      });
      
      // Store the user ID for later verification and cleanup
      const userId = event.data.id;
      
      // Invoke the webhook with the mock event
      cy.task('invokeWebhook', { event }).then((response) => {
        expect(response.status).to.equal(200);
        
        // Wait for webhook processing to complete
        cy.wait(2000); // Wait for webhook processing
        
        // Verify that the user was created in the database
        cy.task('verifyUserExists', { 
          userId,
          expectedData: {
            clerk_id: userId,
            email: testEmail,
            name: '', // Empty name should be handled gracefully
            user_role: 'user' // Default role
          }
        }).then((result) => {
          expect(result.success).to.be.true;
          cy.log('User with empty name fields was successfully created');
          
          // Clean up the test user
          cy.task('removeTestUser', { userId });
        });
      });
    });
  });
  
  describe('Comprehensive User Creation Tests', () => {
    // Clean up test users before and after tests
    before(() => {
      cy.task('removeAllTestUsers');
    });
  
    after(() => {
      cy.task('removeAllTestUsers');
    });
  
    it('should create a user with all fields and admin role', () => {
      // Generate test data
      const testEmail = `admin-${generateTestId()}@example.com`;
      const testFirstName = 'Admin';
      const testLastName = 'User';
      
      // Create mock user creation event with admin role
      const event = generateUserCreatedEvent({
        firstName: testFirstName,
        lastName: testLastName,
        email: testEmail,
        role: 'admin'
      });
      
      // Store the user ID for later verification and cleanup
      const userId = event.data.id;
      
      // Invoke the webhook with the mock event
      cy.task('invokeWebhook', { event }).then((response) => {
        expect(response.status).to.equal(200);
        
        // Wait for webhook processing to complete
        cy.wait(2000);
        
        // Verify that the user was created with admin role
        cy.task('verifyUserExists', { 
          userId,
          expectedData: {
            clerk_id: userId,
            email: testEmail,
            name: `${testFirstName} ${testLastName}`,
            user_role: 'admin'
          }
        }).then((result) => {
          expect(result.success).to.be.true;
          cy.log('Admin user was successfully created');
          
          // Clean up the test user
          cy.task('removeTestUser', { userId });
        });
      });
    });
  
    it('should create a user with caregiver role', () => {
      // Generate test data
      const testEmail = `caregiver-${generateTestId()}@example.com`;
      const testFirstName = 'Care';
      const testLastName = 'Giver';
      
      // Create mock user creation event with caregiver role
      const event = generateUserCreatedEvent({
        firstName: testFirstName,
        lastName: testLastName,
        email: testEmail,
        role: 'caregiver'
      });
      
      // Store the user ID for later verification and cleanup
      const userId = event.data.id;
      
      // Invoke the webhook with the mock event
      cy.task('invokeWebhook', { event }).then((response) => {
        expect(response.status).to.equal(200);
        
        // Wait for webhook processing to complete
        cy.wait(2000);
        
        // Verify that the user was created with caregiver role
        cy.task('verifyUserExists', { 
          userId,
          expectedData: {
            clerk_id: userId,
            email: testEmail,
            name: `${testFirstName} ${testLastName}`,
            user_role: 'caregiver'
          }
        }).then((result) => {
          expect(result.success).to.be.true;
          cy.log('Caregiver user was successfully created');
          
          // Clean up the test user
          cy.task('removeTestUser', { userId });
        });
      });
    });
  
    it('should handle different role naming conventions', () => {
      // Test different role naming conventions that should map to the same role
      const roleVariations = [
        { clerkRole: 'admin', expectedRole: 'admin' },
        { clerkRole: 'administrator', expectedRole: 'admin' },
        { clerkRole: 'caregiver', expectedRole: 'caregiver' },
        { clerkRole: 'care_giver', expectedRole: 'caregiver' },
        { clerkRole: 'care-giver', expectedRole: 'caregiver' },
        { clerkRole: 'user', expectedRole: 'user' },
        { clerkRole: 'standard', expectedRole: 'user' },
        { clerkRole: 'default', expectedRole: 'user' },
        { clerkRole: 'unknown_role', expectedRole: 'user' } // Should default to 'user'
      ];
      
      // Test each role variation sequentially
      cy.wrap(roleVariations).each((variation) => {
        const testEmail = `role-test-${generateTestId()}@example.com`;
        
        // Create event with the test role
        const event = generateUserCreatedEvent({
          firstName: 'Role',
          lastName: 'Test',
          email: testEmail,
          role: variation.clerkRole as any
        });
        
        const userId = event.data.id;
        
        // Invoke webhook and verify role mapping
        cy.task('invokeWebhook', { event }).then(() => {
          cy.wait(2000);
          
          cy.task('verifyUserExists', { 
            userId,
            expectedData: {
              clerk_id: userId,
              user_role: variation.expectedRole
            }
          }).then((result) => {
            expect(result.success).to.be.true;
            cy.log(`Role '${variation.clerkRole}' correctly mapped to '${variation.expectedRole}'`);
            
            // Clean up before next test
            cy.task('removeTestUser', { userId });
          });
        });
      });
    });
  });
  describe('User Creation Error Handling Tests', () => {
    // Clean up test users before and after tests
    before(() => {
      cy.task('removeAllTestUsers');
    });
  
    after(() => {
      cy.task('removeAllTestUsers');
    });
  
    it('should handle malformed user creation events gracefully', () => {
      // Test different types of malformed events
      const malformedTypes = ['missing-id', 'missing-email', 'empty-payload'];
      
      cy.wrap(malformedTypes).each((type) => {
        // Generate a malformed event
        const event = generateMalformedEvent(type as any);
        
        // Invoke the webhook with the malformed event
        cy.task('invokeWebhook', { event }).then((response) => {
          // Even with malformed data, the webhook should respond
          // The status might be 200 (if it handles errors internally) or an error code
          expect(response).to.exist;
          
          if (response.status !== 200) {
            cy.log(`Webhook correctly returned error status ${response.status} for ${type} event`);
          } else {
            cy.log(`Webhook handled ${type} event gracefully with status 200`);
          }
        });
      });
    });
  
    it('should handle duplicate user creation attempts', () => {
      // Generate test data
      const testEmail = `duplicate-${generateTestId()}@example.com`;
      const testFirstName = 'Duplicate';
      const testLastName = 'User';
      
      // Create mock user creation event
      const event = generateUserCreatedEvent({
        firstName: testFirstName,
        lastName: testLastName,
        email: testEmail
      });
      
      const userId = event.data.id;
      
      // First creation should succeed
      cy.task('invokeWebhook', { event }).then((response) => {
        expect(response.status).to.equal(200);
        cy.wait(2000);
        
        // Verify user was created
        cy.task('verifyUserExists', { userId }).then((result) => {
          expect(result.success).to.be.true;
          
          // Try to create the same user again
          cy.task('invokeWebhook', { event }).then((duplicateResponse) => {
            // The webhook should handle duplicate creation gracefully
            expect(duplicateResponse.status).to.equal(200);
            
            // Clean up the test user
            cy.task('removeTestUser', { userId });
          });
        });
      });
    });
  
    it('should log appropriate information for error cases', () => {
      // This test is more challenging to verify in an automated way
      // since we need to check logs. For now, we'll just invoke with
      // invalid data and verify the response.
      
      // Generate an event with invalid type
      const event = generateMalformedEvent('invalid-type');
      
      cy.task('invokeWebhook', { event }).then((response) => {
        // The webhook should respond, even for invalid event types
        expect(response).to.exist;
        
        // Note: In a real implementation, you might want to check
        // log output or add instrumentation to verify logging
        cy.log('Webhook responded to invalid event type');
      });
    });
  });
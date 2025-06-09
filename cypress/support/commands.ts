/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-namespace */
import { getTestUser, setTestAuthHeader, visitAsAuthenticatedUser } from './auth-utils';

declare global {
  namespace Cypress {
    interface Chainable {
      visitAsAuthenticatedUser(path: string): Chainable<void>;
      mockClerkAuth(userType?: string): Chainable<void>;
      mockApiAuth(): Chainable<void>;
    }
  }
}

// Visit a page as an authenticated user
Cypress.Commands.add('visitAsAuthenticatedUser', (path: string) => {
  return visitAsAuthenticatedUser(path);
});

// Mock Clerk authentication
Cypress.Commands.add('mockClerkAuth', (userType = 'default') => {
  // Load user data from fixture
  return cy.fixture(`users/${userType}-user.json`).then(userData => {
    // Intercept Clerk auth checks and return authenticated state
    cy.intercept('GET', '**/api/auth/**', {
      statusCode: 200,
      body: {
        isSignedIn: true,
        user: {
          id: userData.userId,
          firstName: userData.firstName,
          lastName: userData.lastName,
          emailAddresses: [{
            emailAddress: userData.email,
            id: 'email_' + Math.random().toString(36).substring(2),
            verification: { status: 'verified' }
          }],
          publicMetadata: {
            role: userData.roles?.[0] || 'user'
          }
        }
      }
    }).as('authCheck');
    
    // Intercept user session checks
    cy.intercept('GET', '**/user', {
      statusCode: 200,
      body: {
        id: userData.userId,
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email,
        role: userData.roles?.[0] || 'user'
      }
    }).as('userCheck');
  });
});

// Mock API authentication
Cypress.Commands.add('mockApiAuth', () => {
  // Intercept all API requests and add auth headers
  cy.intercept('**', (req) => {
    setTestAuthHeader(req);
  });
});
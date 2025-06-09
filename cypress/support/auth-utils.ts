// cypress/support/auth-utils.ts

/**
 * Authentication utilities for Cypress tests
 */

/**
 * Get test authentication configuration
 */
export const getTestAuthConfig = () => {
  return Cypress.env('testAuth') || {
    enabled: true,
    defaultUser: {
      userId: 'test-user-id',
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com',
      roles: ['user']
    }
  };
};

/**
 * Get a test user configuration by type
 */
export const getTestUser = (type = 'defaultUser') => {
  const config = getTestAuthConfig();
  return config[type] || config.defaultUser;
};

/**
 * Set test authentication header for requests
 */
export const setTestAuthHeader = (req: { headers: { [x: string]: string; }; }) => {
  req.headers = req.headers || {};
  req.headers['x-cypress-test-auth'] = 'true';
  req.headers['x-test-user-id'] = getTestUser().userId;
  return req;
};

/**
 * Visit a page as an authenticated user
 */
export const visitAsAuthenticatedUser = (path: string) => {
  // Intercept all API requests and add auth headers
  cy.intercept('**', (req) => {
    setTestAuthHeader(req);
  });
  
  // Visit the page
  return cy.visit(path, {
    headers: {
      'x-cypress-test-auth': 'true',
      'x-test-user-id': getTestUser().userId
    }
  });
};
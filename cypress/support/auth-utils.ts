// cypress/support/auth-utils.ts
// eslint-disable-next-line @typescript-eslint/ban-ts-comment

/**
 * Authentication utilities for Cypress tests
 */

/**
 * Check if we're running in a test environment
 */
export const isTestEnvironment = (): boolean => {
  return Cypress.env('isTestEnvironment') === true;
};

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
 * Check if test authentication is enabled
 */
export const isTestAuthEnabled = (): boolean => {
  const config = getTestAuthConfig();
  return config.enabled === true;
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
  if (isTestAuthEnabled()) {
    req.headers = req.headers || {};
    req.headers['x-cypress-test-auth'] = 'true';
  }
  return req;
};

/**
 * Load a user fixture by type
 */
export const loadUserFixture = (userType = 'default') => {
  const fixtureMap: Record<string, string> = {
    default: 'users/default-user.json',
    admin: 'users/admin-user.json',
    caretaker: 'users/caretaker-user.json'
  };
  
  const fixturePath = fixtureMap[userType] || fixtureMap.default;
  return cy.fixture(fixturePath);
};

/**
 * Set up authentication with a specific user fixture
 */
export const loginWithUserFixture = (userType = 'default') => {
  return loadUserFixture(userType).then(userData => {
    return cy.loginWithClerk({
      userId: userData.id,
      firstName: userData.firstName,
      lastName: userData.lastName,
      email: userData.email,
      roles: userData.roles,
      metadata: userData.metadata
    });
  });
};
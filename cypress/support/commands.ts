// cypress/support/commands.ts
import { mount } from 'cypress/react18';
import { MockUserOptions, setupAuthState, clearAuthState } from './auth-mock';
import { getTestUser, setTestAuthHeader } from './auth-utils';

// Add mount command for component testing
Cypress.Commands.add('mount', mount);

// Enhanced command to simulate authenticated user
Cypress.Commands.add('loginWithClerk', (options?: MockUserOptions | string) => {
  // Clear any existing auth state first
  clearAuthState();
  
  // Handle string parameter for backward compatibility
  let userOptions: MockUserOptions = {};
  
  if (typeof options === 'string') {
    // If options is a string, treat it as userId
    userOptions = { userId: options };
  } else if (options && typeof options === 'object') {
    // If options is an object, use it directly
    userOptions = options;
  } else {
    // If no options provided, use default test user
    userOptions = getTestUser();
  }
  
  // Set up complete auth state
  const authState = setupAuthState(userOptions);
  
  // Log authentication for debugging
  Cypress.log({
    name: 'loginWithClerk',
    message: `Logged in as ${userOptions.userId || 'test user'}`,
    consoleProps: () => {
      return {
        'User ID': userOptions.userId,
        'User Email': userOptions.email,
        'User Roles': userOptions.roles,
      };
    },
  });
  
  return cy.wrap(authState, { log: false });
});

// Enhanced command to visit page as authenticated user
Cypress.Commands.add('visitAsAuthenticatedUser', (url: string, options?: MockUserOptions) => {
  cy.loginWithClerk(options);
  
  cy.visit(url, {
    onBeforeLoad: (win) => {
      // Add test auth flag to window object
      Object.defineProperty(win, 'cypressTestAuth', {
        value: true,
        configurable: true
      });
    },
    headers: {
      'x-cypress-test-auth': 'true'
    }
  });
});

// Command for making authenticated API requests
Cypress.Commands.add('authenticatedRequest', (options: Cypress.RequestOptions) => {
  // Add auth headers to the request
  const requestWithAuth = {
    ...options,
    headers: {
      ...options.headers,
      'x-cypress-test-auth': 'true'
    }
  };
  
  return cy.request(requestWithAuth);
});

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      mount: typeof mount;
      loginWithClerk(options?: MockUserOptions | string): Chainable<{sessionData: any, cookieData: any}>;
      visitAsAuthenticatedUser(url: string, options?: MockUserOptions): Chainable<void>;
      authenticatedRequest(options: Cypress.RequestOptions): Chainable<Cypress.Response<any>>;
    }
  }
}
// cypress/support/auth-mock.ts

/**
 * Types for authentication mocking
 */
export interface MockUserOptions {
  userId?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  roles?: string[];
  metadata?: Record<string, any>;
  sessionToken?: string;
}

/**
 * Generate mock Clerk session data for testing
 */
export function createMockClerkSession(options: MockUserOptions = {}) {
  const {
    userId = 'test-user-id',
    firstName = 'Test',
    lastName = 'User',
    email = 'test@example.com',
    roles = ['user'],
    metadata = {}
  } = options;

  return {
    sessions: [{
      lastActiveAt: new Date().toISOString(),
      lastActiveToken: {
        value: `test-token-${userId}`
      },
      userId
    }],
    users: {
      [userId]: {
        id: userId,
        firstName,
        lastName,
        emailAddresses: [{
          id: `email-${userId}`,
          emailAddress: email,
          verification: { status: 'verified' }
        }],
        publicMetadata: {
          roles,
          ...metadata
        }
      }
    }
  };
}

/**
 * Set mock Clerk session in localStorage
 */
export function setMockClerkSession(options: MockUserOptions = {}) {
  const sessionData = createMockClerkSession(options);
  localStorage.setItem('clerk-db', JSON.stringify(sessionData));
  return sessionData;
}

/**
 * Set authentication cookies for Clerk
 */
export function setAuthCookies(options: MockUserOptions = {}) {
  const { userId = 'test-user-id', sessionToken = 'test-session-token' } = options;
  
  // Set the main session cookie
  cy.setCookie('__clerk_session', sessionToken);
  
  // Set additional cookies that might be needed
  cy.setCookie('__clerk_client_jwt', `test-jwt-${userId}`);
  
  return { userId, sessionToken };
}

/**
 * Clear all authentication cookies
 */
export function clearAuthCookies() {
  cy.clearCookie('__clerk_session');
  cy.clearCookie('__clerk_client_jwt');
}

/**
 * Set up complete authentication state (localStorage + cookies)
 */
export function setupAuthState(options: MockUserOptions = {}) {
  const sessionData = setMockClerkSession(options);
  const cookieData = setAuthCookies(options);
  
  return { sessionData, cookieData };
}

/**
 * Clear all authentication state
 */
export function clearAuthState() {
  clearMockClerkSession();
  clearAuthCookies();
}
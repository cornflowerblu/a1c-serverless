// cypress/support/auth-mock.ts
export interface MockUserOptions {
  userId?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  roles?: string[];
  metadata?: Record<string, any>;
}

// Default mock user data
const DEFAULT_USER: MockUserOptions = {
  userId: 'mock-user-123',
  firstName: 'Test',
  lastName: 'User',
  email: 'test@example.com',
  roles: ['user'],
  metadata: {}
};

/**
 * Create a mock JWT that resembles Clerk's JWT structure
 */
function createMockClerkJWT(userData: MockUserOptions) {
  // Create a JWT-like structure with header, payload, and signature parts
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  
  const payload = btoa(JSON.stringify({
    azp: 'clerk',
    exp: Math.floor(Date.now() / 1000) + 3600,
    iat: Math.floor(Date.now() / 1000),
    iss: 'https://clerk.your-app.com',
    nbf: Math.floor(Date.now() / 1000),
    sub: userData.userId,
    sid: `sess_${Math.random().toString(36).substring(2, 15)}`,
    // Clerk-specific claims
    email: userData.email,
    name: `${userData.firstName} ${userData.lastName}`.trim(),
    given_name: userData.firstName,
    family_name: userData.lastName,
    // Custom claims
    'https://clerk.dev/roles': userData.roles,
    'https://clerk.dev/user_metadata': userData.metadata
  }));
  
  // Create a fake signature (in real JWT this would be cryptographically signed)
  const signature = btoa('mock_signature');
  
  return `${header}.${payload}.${signature}`;
}

/**
 * Set up mock authentication state in the browser
 */
export const setupAuthState = (userData: MockUserOptions = DEFAULT_USER) => {
  const mockUser = { ...DEFAULT_USER, ...userData };
  
  // Create a mock JWT token
  const sessionToken = createMockClerkJWT(mockUser);
  
  // Set Clerk-specific items in localStorage
  localStorage.setItem('__clerk_client_jwt', sessionToken);
  
  // Set session data
  const sessionData = {
    lastActiveTime: new Date().toISOString(),
    lastActiveOrganizationId: null,
    userId: mockUser.userId,
    sessionId: `sess_${Math.random().toString(36).substring(2, 15)}`,
    actor: null
  };
  localStorage.setItem('__clerk_db', JSON.stringify({
    sessions: {
      activeSessions: [sessionData]
    },
    user: {
      id: mockUser.userId,
      firstName: mockUser.firstName,
      lastName: mockUser.lastName,
      primaryEmailAddress: {
        emailAddress: mockUser.email
      },
      publicMetadata: {
        role: mockUser.roles?.[0] || 'user'
      }
    }
  }));
  
  // Return the mock data for use in tests
  return {
    user: mockUser,
    token: sessionToken
  };
};

/**
 * Clear mock authentication state
 */
export const clearAuthState = () => {
  localStorage.removeItem('__clerk_client_jwt');
  localStorage.removeItem('__clerk_db');
};
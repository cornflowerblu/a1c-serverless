'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

// Only include this component in non-production builds
const isTestEnvironment = process.env.NODE_ENV !== 'production';

// Test authentication context
interface TestAuthContextType {
  isTestAuth: boolean;
  testUser: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    roles: string[];
  } | null;
}

const defaultContext: TestAuthContextType = {
  isTestAuth: false,
  testUser: null
};

const TestAuthContext = createContext<TestAuthContextType>(defaultContext);

export const useTestAuth = () => useContext(TestAuthContext);

export function TestAuthProvider({ children }: { children: React.ReactNode }) {
  const [authState, setAuthState] = useState<TestAuthContextType>(defaultContext);

  useEffect(() => {
    // Check if we're in a Cypress test environment
    const isCypressTest = (window as any).cypressTestAuth === true;
    
    if (isCypressTest && isTestEnvironment) {
      // Get user data from localStorage if available
      try {
        const clerkData = localStorage.getItem('clerk-db');
        if (clerkData) {
          const parsed = JSON.parse(clerkData);
          const userId = parsed.sessions?.[0]?.userId;
          const user = parsed.users?.[userId];
          
          if (user) {
            setAuthState({
              isTestAuth: true,
              testUser: {
                id: user.id,
                firstName: user.firstName || 'Test',
                lastName: user.lastName || 'User',
                email: user.emailAddresses?.[0]?.emailAddress || 'test@example.com',
                roles: user.publicMetadata?.roles || ['user']
              }
            });
          }
        }
      } catch (error) {
        console.error('Error parsing test auth data:', error);
      }
    }
  }, []);

  // Only render the provider in non-production environments
  if (!isTestEnvironment) {
    return <>{children}</>;
  }

  return (
    <TestAuthContext.Provider value={authState}>
      {children}
    </TestAuthContext.Provider>
  );
}

// HOC to wrap components that need test auth
export function withTestAuth<P extends object>(
  Component: React.ComponentType<P>
): React.FC<P> {
  return function WithTestAuth(props: P) {
    const testAuth = useTestAuth();
    
    return <Component {...props} testAuth={testAuth} />;
  };
}
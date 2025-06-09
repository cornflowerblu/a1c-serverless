# Testing Clerk Google Authentication with Cypress

This guide outlines how to implement programmatic Google authentication testing with Clerk in Cypress, following Cypress best practices for authentication testing.

## Overview

Instead of automating through the Google OAuth UI (which is fragile and prone to changes), we'll use a programmatic approach to:

1. Generate authentication tokens via Clerk's API
2. Set these tokens in the browser's storage
3. Test the authenticated state of your application

## Implementation Steps

### 1. Set Up Test Environment

Create a dedicated test user in your Clerk development instance that uses Google authentication.

### 2. Install Required Dependencies

```bash
npm install cypress @clerk/clerk-sdk-node --save-dev
```

### 3. Create a Custom Cypress Command

Create or update your `cypress/support/commands.js` file:

```javascript
// cypress/support/commands.js
import { Clerk } from '@clerk/clerk-sdk-node';

Cypress.Commands.add('loginWithClerkGoogle', () => {
  // This function will handle the programmatic login
  cy.task('getClerkGoogleSession').then((tokens) => {
    // Set the necessary tokens in localStorage or cookies
    window.localStorage.setItem('__clerk_client_jwt', tokens.sessionToken);
    
    // Additional tokens as needed
    if (tokens.authToken) {
      window.localStorage.setItem('__clerk_auth_token', tokens.authToken);
    }
  });
  
  // Visit the app after setting tokens
  cy.visit('/');
});
```

### 4. Set Up Cypress Tasks

In your `cypress.config.js` or `cypress.config.ts`:

```javascript
import { defineConfig } from 'cypress';
import { Clerk } from '@clerk/clerk-sdk-node';

export default defineConfig({
  e2e: {
    setupNodeEvents(on, config) {
      // Create a task to get Clerk session tokens
      on('task', {
        async getClerkGoogleSession() {
          // Initialize Clerk with your secret key
          const clerk = Clerk({ secretKey: process.env.CLERK_SECRET_KEY });
          
          // Get or create a session for your test user
          const userId = process.env.TEST_USER_ID; // Your test user's ID
          
          // Create a session token for this user
          const sessionToken = await clerk.sessions.createToken({
            userId,
            // Optional: specify session duration, etc.
          });
          
          return {
            sessionToken,
            // Include any other tokens needed for your app
          };
        }
      });
      
      return config;
    },
    baseUrl: 'http://localhost:3000',
  },
});
```

### 5. Set Up Environment Variables

Create a `.env` file for Cypress (don't commit this to version control):

```
CLERK_SECRET_KEY=your_clerk_secret_key
TEST_USER_ID=your_test_user_id
```

### 6. Write Your Tests

Now you can write tests that use this authentication method:

```javascript
// cypress/e2e/auth.cy.js
describe('Authentication with Google', () => {
  beforeEach(() => {
    // Use our custom command to log in programmatically
    cy.loginWithClerkGoogle();
  });

  it('should be logged in and access protected content', () => {
    // Visit a protected route
    cy.visit('/');
    
    // Verify the user is logged in
    cy.get('[data-testid="user-profile"]').should('be.visible');
    cy.contains('Welcome').should('be.visible');
    
    // Test functionality that requires authentication
    cy.get('[data-testid="protected-content"]').should('be.visible');
  });
  
  it('should show user info from Google account', () => {
    cy.visit('/profile');
    
    // Check that Google profile data is displayed
    cy.get('[data-testid="user-name"]').should('not.be.empty');
    cy.get('[data-testid="user-email"]').should('contain', '@gmail.com');
  });
});
```

### 7. Handle Token Refresh (Optional)

If your tests run long enough that tokens might expire:

```javascript
Cypress.Commands.add('refreshClerkSession', () => {
  cy.task('getClerkGoogleSession').then((tokens) => {
    window.localStorage.setItem('__clerk_client_jwt', tokens.sessionToken);
  });
});
```

### 8. Clean Up After Tests

```javascript
afterEach(() => {
  // Clear authentication state
  cy.window().then((win) => {
    win.localStorage.removeItem('__clerk_client_jwt');
    // Remove any other auth-related items
  });
});
```

## Benefits of This Approach

- **Reliability**: Avoids the flakiness of UI-based social login tests
- **Speed**: Much faster than going through the actual Google login screens
- **Stability**: Less prone to breaking when Google's UI changes
- **Reusability**: Can be easily adapted for other social providers

## Additional Tips

1. Use a dedicated test environment for Clerk to avoid affecting production data
2. Consider using Clerk's test mode for development and testing
3. Never hardcode real credentials in your tests
4. Use environment variables for sensitive information
5. Consider mocking certain authentication flows for faster tests

## References

- [Cypress Authentication Testing Guide](https://docs.cypress.io/app/guides/authentication-testing/google-authentication)
- [Clerk Documentation](https://clerk.com/docs)

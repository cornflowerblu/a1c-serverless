# E2E Testing with Cypress

This document provides guidance on how to use the authentication system in Cypress tests for the A1C Estimator application.

## Authentication in Tests

The application uses Clerk for authentication, but for testing purposes, we've implemented a mock authentication system that bypasses the actual Clerk authentication flow.

### Authentication Commands

The following Cypress commands are available for authentication:

#### `cy.loginWithClerk(options)`

Simulates a user login with Clerk. This sets up the necessary localStorage and cookies to mimic an authenticated session.

**Parameters:**
- `options`: (Optional) Either a string representing the user ID or an object with the following properties:
  - `userId`: User ID (default: 'test-user-id')
  - `firstName`: User's first name (default: 'Test')
  - `lastName`: User's last name (default: 'User')
  - `email`: User's email (default: 'test@example.com')
  - `roles`: Array of user roles (default: ['user'])
  - `metadata`: Additional user metadata (default: {})

**Example:**
```typescript
// Login with default test user
cy.loginWithClerk();

// Login with custom user ID
cy.loginWithClerk('custom-user-id');

// Login with custom user properties
cy.loginWithClerk({
  userId: 'custom-user-id',
  firstName: 'Custom',
  lastName: 'User',
  email: 'custom@example.com',
  roles: ['admin', 'user']
});
```

#### `cy.visitAsAuthenticatedUser(url, options)`

Visits a URL as an authenticated user. This combines `loginWithClerk` and `cy.visit` with the necessary authentication headers.

**Parameters:**
- `url`: The URL to visit
- `options`: (Optional) User options to pass to `loginWithClerk`

**Example:**
```typescript
// Visit dashboard as default test user
cy.visitAsAuthenticatedUser('/dashboard');

// Visit dashboard as admin user
cy.visitAsAuthenticatedUser('/dashboard', {
  userId: 'admin-user-id',
  roles: ['admin', 'user']
});
```

#### `cy.authenticatedRequest(options)`

Makes an authenticated API request with the necessary authentication headers.

**Parameters:**
- `options`: Cypress request options

**Example:**
```typescript
cy.authenticatedRequest({
  method: 'GET',
  url: '/api/readings'
}).then((response) => {
  expect(response.status).to.eq(200);
});
```

### User Fixtures

Predefined user fixtures are available for testing different user roles:

- `default`: Regular user
- `admin`: Admin user
- `caretaker`: Caretaker user

You can use these fixtures with the `loginWithUserFixture` command:

```typescript
// Login as admin user
cy.loginWithUserFixture('admin');

// Login as caretaker user
cy.loginWithUserFixture('caretaker');
```

### Intercepting API Requests

When intercepting API requests in tests, make sure to add the authentication header:

```typescript
cy.intercept('GET', '/api/readings', (req) => {
  req.headers['x-cypress-test-auth'] = 'true';
  req.reply({ fixture: 'readings.json' });
}).as('getReadings');
```

## Troubleshooting

### Authentication Not Working

If authentication is not working in your tests:

1. Check that you're using the authentication commands correctly
2. Verify that the middleware is properly detecting the test authentication header
3. Make sure you're not in production mode (test authentication only works in development and test environments)
4. Check the browser console for any errors related to authentication

### Redirects to Login Page

If your tests are being redirected to the login page:

1. Make sure you're using `cy.visitAsAuthenticatedUser` instead of regular `cy.visit`
2. Check that the authentication headers are being sent with the request
3. Verify that the middleware is correctly bypassing authentication for test requests

### API Requests Failing

If authenticated API requests are failing:

1. Make sure you're adding the `x-cypress-test-auth` header to intercepted requests
2. Check that the API routes are properly handling test authentication
3. Verify that the middleware is correctly detecting the test authentication header
# A1C Serverless

A modern web application for tracking blood glucose readings and estimating A1C levels, built with Next.js, Clerk, and Supabase.

## Tech Stack

- **Frontend**: Next.js with App Router, React 19, TypeScript, TailwindCSS
- **Authentication**: Clerk
- **Database**: Supabase PostgreSQL
- **Background Processing**: Supabase Job Queue
- **Testing**: Vitest (unit/integration), Cypress (E2E)
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Supabase account and project
- Clerk account and project

### Environment Setup

Create a `.env` file in the root directory with:

```
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier
- `npm test` - Run Vitest tests
- `npm run test:watch` - Run Vitest in watch mode
- `npm run test:coverage` - Generate test coverage report
- `npm run test:e2e` - Run Cypress tests
- `npm run test:e2e:open` - Open Cypress test runner

### Project Structure

```
a1c-serverless/
├── src/
│   ├── app/            # Next.js App Router
│   │   ├── api/        # API routes
│   │   ├── components/ # React components
│   │   └── lib/        # Utility functions
│   ├── tests/          # Vitest tests
│   └── middleware.ts   # Next.js middleware
├── cypress/            # Cypress E2E tests
├── public/             # Static assets
└── ...config files
```

## Features

- User authentication and profile management
- Glucose reading tracking with context (meal time, etc.)
- A1C calculation based on glucose readings
- Run and month organization for readings
- Background processing for calculations
- Responsive design for mobile and desktop

## Testing

- **Unit/Integration Tests**: Using Vitest and React Testing Library
- **E2E Tests**: Using Cypress with mock authentication

Run tests with:

```bash
# Unit tests
npm test

# E2E tests
npm run test:e2e

# Open Cypress test runner
npm run test:e2e:open
```

### E2E Testing with Authentication

The application uses a custom authentication system for Cypress tests that bypasses the actual Clerk authentication flow. This allows testing protected routes without real authentication.

```typescript
// Login with default test user
cy.loginWithClerk();

// Visit a protected route as an authenticated user
cy.visitAsAuthenticatedUser('/dashboard');

// Login with a specific user role
cy.loginWithUserFixture('admin');
cy.visitAsAuthenticatedUser('/dashboard');

// Make authenticated API requests
cy.authenticatedRequest({
  method: 'GET',
  url: '/api/readings'
});
```

See [E2E Testing Documentation](docs/e2e-test.md) for more details.

## Deployment

This application is configured for deployment on Vercel:

```bash
# Build and deploy
vercel
```

## License

[MIT](LICENSE)
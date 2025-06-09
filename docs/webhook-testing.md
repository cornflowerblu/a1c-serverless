# Webhook Testing Documentation

## Overview

This document describes the testing approach for the user synchronization webhook system, which handles user creation, updates, and deletion events from Clerk. The testing framework verifies both the direct webhook processing and the job queue integration to ensure reliable user data synchronization.

## Testing Architecture

The webhook testing system consists of several components:

1. **Test Utilities**: Helper functions for generating mock events, verifying database state, and cleaning up test data
2. **Job Queue Integration**: Tests for the asynchronous job processing system
3. **End-to-End Lifecycle Tests**: Tests that cover the complete user lifecycle
4. **CI Integration**: GitHub Actions workflows for automated testing

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Mock Event    │────▶│    Webhook      │────▶│   Job Queue     │
│   Generator     │     │    Endpoint     │     │                 │
└─────────────────┘     └─────────────────┘     └────────┬────────┘
                                                         │
                                                         ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Test Cleanup   │◀────│  DB Verification │◀────│  Job Processor  │
│                 │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

## Test Utilities

### 1. Webhook Event Generator

Located in `src/tests/utils/clerk-webhook-test-utils.ts`, this utility provides functions to generate mock Clerk webhook events:

- `generateUserCreatedEvent()`: Creates a mock user creation event
- `generateUserUpdatedEvent()`: Creates a mock user update event
- `generateUserDeletedEvent()`: Creates a mock user deletion event
- `generateTestId()`: Generates unique IDs for test users

Example usage:

```typescript
const event = generateUserCreatedEvent({
  firstName: 'Test',
  lastName: 'User',
  email: 'test@example.com',
  role: 'admin'
});
```

### 2. Webhook Invoker

Located in `src/tests/utils/webhook-invoker.ts`, this utility provides functions to invoke the webhook with mock events:

- `invokeWebhook()`: Sends a mock event to the webhook endpoint
- `verifyDatabaseState()`: Checks if the database state matches expectations
- `waitForWebhookProcessing()`: Waits for asynchronous webhook processing to complete

Example usage:

```typescript
const response = await invokeWebhook(event, { timeout: 3000 });
```

### 3. Database Verification

Located in `src/tests/utils/webhook-db-verifier.ts`, this utility provides functions to verify the database state:

- `verifyUserExists()`: Checks if a user exists with the expected data
- `verifyUserUpdated()`: Checks if a user was updated with the expected data
- `verifyUserDeleted()`: Checks if a user was deleted from the database
- `waitForDatabaseChange()`: Waits for database changes with timeout and retries

Example usage:

```typescript
const result = await verifyUserExists(userId, {
  clerk_id: userId,
  email: 'test@example.com',
  name: 'Test User',
  user_role: 'admin'
});
```

### 4. Test Cleanup

Located in `src/tests/utils/webhook-test-cleanup.ts`, this utility provides functions to clean up test data:

- `removeTestUser()`: Removes a specific test user from the database
- `removeAllTestUsers()`: Removes all test users from the database
- `verifyCleanupComplete()`: Verifies that all test data has been cleaned up

Example usage:

```typescript
await removeTestUser(userId);
```

### 5. Job Queue Verification

Located in `src/tests/utils/webhook-job-verifier.ts`, this utility provides functions to verify job queue integration:

- `verifyJobCreated()`: Checks if a job was created for a webhook event
- `waitForJobStatus()`: Waits for a job to reach a specific status
- `triggerJobProcessing()`: Triggers job processing for a specific job
- `processJobToCompletion()`: Processes a job until completion or failure
- `verifyWebhookJobFlow()`: Verifies the complete flow from webhook event to job processing

Example usage:

```typescript
const jobResult = await verifyJobCreated(event.type, userId);
await processJobToCompletion(jobResult.jobId);
```

## Test Cases

### User Creation Tests

Located in `cypress/e2e/webhook-user-creation.cy.ts`, these tests verify that users are properly created when Clerk user creation events are received:

1. Creating a user with minimal required fields
2. Handling empty name fields gracefully
3. Creating users with different roles (admin, caregiver, user)
4. Handling different role naming conventions
5. Error handling for malformed events and duplicate users

### User Update Tests

Located in `cypress/e2e/webhook-user-update.cy.ts`, these tests verify that users are properly updated when Clerk user update events are received:

1. Updating user profile information
2. Changing user roles
3. Handling partial updates
4. Error handling for non-existent users

### User Deletion Tests

Located in `cypress/e2e/webhook-user-deletion.cy.ts`, these tests verify that users are properly deleted when Clerk user deletion events are received:

1. Deleting existing users
2. Handling deletion of non-existent users
3. Verifying cleanup of related data

### Job Queue Integration Tests

Located in `cypress/e2e/webhook-job-integration.cy.ts`, these tests verify the integration with the job queue system:

1. Creating jobs for user events
2. Processing jobs to completion
3. Handling job failures gracefully
4. Retrying failed jobs with exponential backoff

### User Lifecycle Tests

Located in `cypress/e2e/webhook-user-lifecycle.cy.ts`, these tests verify the complete user lifecycle:

1. Creating, updating, and deleting a user in sequence
2. Handling multiple role changes throughout the lifecycle
3. Maintaining data consistency through the lifecycle

## Running Tests

### Local Development

To run the webhook tests locally:

1. Start the Supabase local development environment:
   ```bash
   supabase start
   ```

2. Deploy the webhook functions:
   ```bash
   supabase functions deploy clerk-webhook --no-verify-jwt
   supabase functions deploy user-job-processor --no-verify-jwt
   ```

3. Set up the job queue functions:
   ```bash
   PGPASSWORD=postgres psql -h localhost -U postgres -d postgres -p 54322 -f src/supabase/functions/sql/job_queue_functions.sql
   ```

4. Run the tests:
   ```bash
   # Run all webhook tests
   npx cypress run --spec "cypress/e2e/webhook-*.cy.ts"
   
   # Run a specific test file
   npx cypress run --spec "cypress/e2e/webhook-user-creation.cy.ts"
   
   # Run tests in interactive mode
   npx cypress open
   ```

### CI Environment

The webhook tests are automatically run in the CI environment when changes are made to relevant files. The workflow is defined in `.github/workflows/webhook-tests.yml` and is triggered on:

- Pushes to the `main` branch that affect webhook-related files
- Pull requests that affect webhook-related files
- Manual triggering via the GitHub Actions UI

The CI workflow:

1. Sets up a PostgreSQL database
2. Starts the Supabase local development environment
3. Creates the necessary database schema
4. Deploys the webhook functions
5. Runs the tests
6. Uploads test artifacts (videos and screenshots)
7. Adds a comment to the PR with the test results

## Best Practices

1. **Isolation**: Each test should be isolated and not depend on the state from other tests
2. **Cleanup**: Always clean up test data after tests, even if they fail
3. **Idempotency**: Tests should be idempotent and produce the same results when run multiple times
4. **Error Handling**: Test both happy paths and error scenarios
5. **Timeouts**: Use appropriate timeouts for asynchronous operations
6. **Retries**: Implement retry logic for flaky operations
7. **Logging**: Include detailed logging for debugging test failures

## Troubleshooting

### Common Issues

1. **Tests timing out**: Increase the timeout values in the test utilities
2. **Database connection errors**: Ensure the Supabase local development environment is running
3. **Function deployment failures**: Check the Supabase logs for errors
4. **Job processing failures**: Check the job queue for failed jobs and their error messages

### Debugging Tips

1. Use `cy.log()` to add debug information to the Cypress test output
2. Check the Cypress videos and screenshots for visual debugging
3. Inspect the database state manually using the Supabase Studio
4. Use the `verifyDatabaseState()` function with detailed expected data for precise verification

## Future Improvements

1. **Performance Testing**: Add tests for high-volume webhook processing
2. **Chaos Testing**: Simulate network failures and database outages
3. **Security Testing**: Verify webhook signature validation and authorization
4. **Monitoring**: Add monitoring for webhook processing metrics
5. **Alerting**: Set up alerts for webhook processing failures

## References

- [Clerk Webhook Documentation](https://clerk.com/docs/integration/webhooks)
- [Supabase Edge Functions Documentation](https://supabase.com/docs/guides/functions)
- [Cypress Testing Framework](https://docs.cypress.io/)
- [Job Queue System Documentation](./job-queue.md)
- [User Synchronization Documentation](./user-sync.md)
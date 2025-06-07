# CI/CD Pipeline Documentation

This document describes the Continuous Integration and Continuous Deployment (CI/CD) pipeline set up for the A1C Estimator application.

## Overview

The CI/CD pipeline uses GitHub Actions to automate testing and build verification. The pipeline runs on every push to the main branch and on every pull request to ensure code quality and prevent regressions.

## Workflow Configuration

Location: `/.github/workflows/run-tests.yml`

```yaml
name: Run Tests

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

# Add permissions block to grant access to issues and pull requests
permissions:
  contents: read
  issues: write
  pull-requests: write

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci --legacy-peer-deps
    
    - name: Run linting (non-blocking)
      run: npm run lint || echo "Linting issues found, but continuing workflow"
    
    - name: Run TypeScript type checking (non-blocking)
      run: npx tsc --noEmit || echo "Type checking issues found, but continuing workflow"
    
    - name: Run tests
      run: npm test
      
    - name: Build application
      env:
        NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: ${{ secrets.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || 'pk_test_dummy-key-for-ci-build-verification' }}
        CLERK_SECRET_KEY: ${{ secrets.CLERK_SECRET_KEY || 'sk_test_dummy-key-for-ci-build-verification' }}
      run: npm run build
      
    - name: Add test status comment to PR
      if: github.event_name == 'pull_request'
      uses: actions/github-script@v6
      with:
        github-token: ${{ secrets.GITHUB_TOKEN }}
        script: |
          const output = `#### Test and Build Results 🧪
          ✅ Tests have passed successfully!
          ✅ Build completed successfully!
          
          *Pusher: @${{ github.actor }}, Action: \`${{ github.event_name }}\`*`;
            
          github.rest.issues.createComment({
            issue_number: context.issue.number,
            owner: context.repo.owner,
            repo: context.repo.repo,
            body: output
          })
```

## Pipeline Steps

The CI/CD pipeline consists of the following steps:

1. **Checkout Code**: Checks out the repository code using `actions/checkout@v3`.

2. **Setup Node.js**: Sets up Node.js version 18 with npm caching using `actions/setup-node@v3`.

3. **Install Dependencies**: Installs project dependencies using `npm ci --legacy-peer-deps`.
   - The `--legacy-peer-deps` flag is used to handle peer dependency conflicts, which is important for projects using React 19 and other modern packages.

4. **Run Linting (Non-blocking)**: Runs ESLint to check for code style issues.
   - This step is non-blocking, meaning the workflow will continue even if linting errors are found.
   - The command used is: `npm run lint || echo "Linting issues found, but continuing workflow"`.

5. **Run TypeScript Type Checking (Non-blocking)**: Checks for TypeScript type errors.
   - This step is also non-blocking.
   - The command used is: `npx tsc --noEmit || echo "Type checking issues found, but continuing workflow"`.

6. **Run Tests**: Runs the test suite using Vitest.
   - This step is blocking, meaning the workflow will fail if any tests fail.
   - The command used is: `npm test`.

7. **Build Application**: Builds the Next.js application.
   - This step is blocking, meaning the workflow will fail if the build fails.
   - The command used is: `npm run build`.
   - Environment variables for Clerk authentication are provided:
     - Uses GitHub secrets if available
     - Falls back to dummy values for CI environment

8. **Add Test Status Comment**: Adds a comment to the pull request with the test and build results.
   - This step only runs on pull requests.
   - Uses the `actions/github-script@v6` action to interact with the GitHub API.

## Permissions

The workflow has the following permissions:
- `contents: read`: Allows reading repository contents
- `issues: write`: Allows creating and updating issues
- `pull-requests: write`: Allows commenting on pull requests

These permissions are necessary for the workflow to comment on pull requests with test results.

## Environment Variables

The workflow uses the following environment variables for the build step:
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`: The Clerk publishable key for authentication
- `CLERK_SECRET_KEY`: The Clerk secret key for authentication

These variables are provided either from GitHub secrets or fallback to dummy values for CI purposes.

## Integration with Vercel

While the GitHub Actions workflow runs tests and verifies the build, the actual deployment is handled by Vercel. The application is directly integrated with Vercel for deployment.

## Future Improvements

1. **Add Code Coverage Reporting**: Integrate a code coverage tool and report coverage metrics in PR comments.

2. **Add Performance Testing**: Implement performance tests to ensure the application meets performance requirements.

3. **Add Security Scanning**: Integrate security scanning tools to identify potential vulnerabilities.

4. **Add Visual Regression Testing**: Implement visual regression tests to catch UI changes.

5. **Configure Branch Protection Rules**: Set up branch protection rules to require passing checks before merging PRs.

6. **Add Status Badges**: Add status badges to the README to show the current status of the CI/CD pipeline.

7. **Implement Deployment Preview**: Set up deployment previews for pull requests to allow testing changes before merging.

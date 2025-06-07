# Glucose Readings Implementation Documentation

This document provides a comprehensive overview of the current implementation of the Glucose Readings feature in the A1C Estimator application.

## Overview

The Glucose Readings feature allows users to record and manage their blood glucose measurements. The implementation follows a Test-Driven Development (TDD) approach, with tests written first and then minimal implementation to make the tests pass.

## Data Model

### Glucose Reading Type Definition

Location: `/src/types/glucose.ts`

The `GlucoseReading` interface defines the structure of a glucose reading:

```typescript
export interface GlucoseReading {
  id: string;
  userId: string;
  userName?: string | null; // Added for caregiver view
  value: number; // in mg/dl
  timestamp: Date;
  mealContext: MealContext;
  notes?: string;
  runId?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

The `MealContext` type defines when the reading was taken relative to meals:

```typescript
export type MealContext =
  | 'BEFORE_BREAKFAST'
  | 'AFTER_BREAKFAST'
  | 'BEFORE_LUNCH'
  | 'AFTER_LUNCH'
  | 'BEFORE_DINNER'
  | 'AFTER_DINNER'
  | 'BEDTIME'
  | 'WAKEUP'
  | 'FASTING'
  | 'OTHER';
```

## Validation

### Zod Schema

Location: `/src/utils/schemas/glucose-schema.ts`

The Zod schema provides validation for glucose readings:

```typescript
export const glucoseReadingSchema = z.object({
  value: z.coerce
    .number()
    .positive('Glucose value must be a positive number')
    .max(1000, 'Glucose value cannot exceed 1000 mg/dL'),
  
  timestamp: z.string()
    .datetime('Invalid date format')
    .refine(
      (date) => new Date(date) <= new Date(),
      'Timestamp cannot be in the future'
    ),
  
  mealContext: mealContextEnum,
  
  notes: z.string()
    .max(1000, 'Notes cannot exceed 1000 characters')
    .optional(),
  
  runId: z.string().optional()
});
```

### Validation Utility

Location: `/src/utils/glucose-validation.ts`

Contains utility functions for validating glucose readings:

- `validateGlucoseReading(reading: GlucoseReading): boolean` - Validates a single reading
- `validateGlucoseReadings(readings: GlucoseReading[]): boolean` - Validates an array of readings

## API Endpoints

Location: `/src/app/api/readings/route.ts`

The API provides the following endpoints:

### GET /api/readings

- Retrieves all glucose readings for the authenticated user
- If the user is a caregiver, also retrieves readings for connected users
- Supports filtering by specific user ID via query parameter
- Returns a JSON response with an array of readings
- Includes error handling for authentication and database errors

### POST /api/readings

- Creates a new glucose reading for the authenticated user
- Validates the input data using the validation utility
- Returns the created reading with a 201 status code
- Includes error handling for validation and database errors

## UI Components

### Glucose Reading Form

Location: `/src/app/components/glucose-reading-form.tsx`

A React component for adding and editing glucose readings:

- Uses React Hook Form with Zod resolver for validation
- Provides input fields for all required properties
- Shows validation errors inline
- Handles form submission with loading state
- Supports initialization with existing data
- Redirects to readings list after successful submission

### Navigation Component

Location: `/src/app/components/navigation.tsx`

A navigation component that provides links to:
- Dashboard
- Readings
- Add Reading
- Profile

## Pages

### Readings List Page

Location: `/src/app/readings/page.tsx`

- Displays a list of glucose readings for the authenticated user
- Shows readings in a tabular format with timestamp, value, and meal context
- Provides a link to add new readings

### Add Reading Page

Location: `/src/app/readings/add/page.tsx`

- Contains the glucose reading form for adding new readings
- Handles form submission and API interaction
- Provides feedback on submission status
- Redirects to readings list after successful submission

### Dashboard Page

Location: `/src/app/dashboard/page.tsx`

- Serves as the main landing page after authentication
- Will eventually display summary statistics and recent readings

## Tests

### Model Tests

Location: `/src/tests/models/glucose-model.test.ts`

Tests for the glucose reading data model:
- Verifies the structure and types of the `GlucoseReading` interface
- Tests all valid meal context values
- Tests database to model transformation

### API Tests

Location: `/src/tests/api/readings-crud.test.ts`

Tests for the API endpoints:
- Tests authentication requirements
- Tests error handling for user not found
- Tests successful retrieval of readings
- Tests validation during creation
- Tests successful creation of readings
- Tests error handling during creation
- Tests caregiver access to connected users' readings

### Validation Tests

Location: `/src/tests/validation/glucose-zod-schema.test.ts`

Tests for the Zod schema validation:
- Tests validation of correct glucose readings
- Tests required fields validation
- Tests value constraints (positive number)
- Tests timestamp constraints (not in future)
- Tests meal context validation
- Tests optional fields and length constraints

### Component Tests

Location: `/src/tests/components/glucose-form.test.tsx`

Tests for the form component:
- Tests rendering of all required fields
- Tests validation of glucose value
- Tests validation of timestamp
- Tests validation of meal context
- Tests form submission with valid data
- Tests display of all meal context options
- Tests loading state during submission

### Integration Tests

Location: `/src/tests/integration/add-reading.test.tsx`

Tests for the add reading page:
- Tests form submission and API interaction
- Tests navigation after successful submission
- Tests error handling during submission

## CI/CD Pipeline

Location: `/.github/workflows/run-tests.yml`

A GitHub Actions workflow that:
- Runs on push to main and on pull requests
- Installs dependencies with legacy peer deps
- Runs linting (non-blocking)
- Runs TypeScript type checking (non-blocking)
- Runs tests (blocking)
- Builds the application (blocking)
- Adds comments to PRs with test and build results
- Uses dummy Clerk keys for CI environment

## Current Status

- ✅ Data model implemented
- ✅ API endpoints implemented
- ✅ Form component implemented
- ✅ Validation implemented
- ✅ Pages and navigation implemented
- ✅ Caregiver access implemented
- ✅ CI/CD pipeline implemented
- ✅ All tests passing

## Known Issues

- Email link logins don't work due to URL mismatch issues (to be fixed in future updates)

## Next Steps

1. Implement Runs Management feature
2. Implement Months Management feature
3. Fix email link login issues
4. Enhance the dashboard with summary statistics and visualizations

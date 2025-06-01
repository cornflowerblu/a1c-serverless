# A1C Estimator - Updated Technical Specification

## System Overview

The A1C Estimator is a modern web application built with Next.js that helps users track blood glucose readings and estimate A1C levels. This document outlines the updated technical architecture, data models, and implementation details for the application.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                      Client Applications                    │
│                                                             │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐    │
│  │               │  │               │  │               │    │
│  │   Web App     │  │   Mobile App  │  │   PWA         │    │
│  │   (Next.js)   │  │ (React Native)│  │               │    │
│  │               │  │               │  │               │    │
│  └───────┬───────┘  └───────┬───────┘  └───────┬───────┘    │
│          │                  │                  │            │
└──────────┼──────────────────┼──────────────────┼────────────┘
           │                  │                  │
           ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                    Shared Component Library                 │
│                                                             │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐    │
│  │               │  │               │  │               │    │
│  │    UI         │  │  Forms        │  │  Charts       │    │
│  │  Components   │  │               │  │               │    │
│  │               │  │               │  │               │    │
│  └───────────────┘  └───────────────┘  └───────────────┘    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
           │                  │                  │
           ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                     Core Business Logic                     │
│                                                             │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐    │
│  │               │  │               │  │               │    │
│  │  A1C          │  │  Data         │  │  User         │    │
│  │  Calculation  │  │  Management   │  │  Management   │    │
│  │               │  │               │  │               │    │
│  └───────────────┘  └───────────────┘  └───────────────┘    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
           │                  │                  │
           ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                        Data Layer                           │
│                                                             │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐    │
│  │               │  │               │  │               │    │
│  │  API          │  │  Supabase     │  │  Storage      │    │
│  │  Services     │  │  Client       │  │  Services     │    │
│  │               │  │               │  │               │    │
│  └───────────────┘  └───────────────┘  └───────────────┘    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
           │                  │                  │
           ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                      Backend Services                       │
│                                                             │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐    │
│  │               │  │               │  │               │    │
│  │  Next.js      │  │  Clerk        │  │  Supabase     │    │
│  │  API Routes   │  │  Auth         │  │  Storage      │    │
│  │               │  │               │  │               │    │
│  └───────────────┘  └───────────────┘  └───────────────┘    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Technology Stack

#### Frontend

- **Framework**: Next.js with App Router
- **Component Library**: React with TypeScript
- **Styling**: TailwindCSS with custom theme
- **State Management**: React Context API + React Query/TanStack Query
- **Form Handling**: React Hook Form with Zod validation
- **Data Visualization**: Recharts or D3.js
- **Testing**: Jest, React Testing Library, Cypress

#### Backend

- **API Framework**: Next.js API routes / Server Actions
- **Authentication**: Clerk
- **Database**: Supabase PostgreSQL
- **File Storage**: Supabase Storage
- **Background Processing**: Supabase Database Functions + Job Queue

#### DevOps

- **CI/CD**: GitHub Actions
- **Hosting**: Vercel
- **Monitoring**: Vercel Analytics + Sentry for error tracking

## Data Models

### Core Entities

#### User

```typescript
interface User {
  id: string;
  email: string;
  name?: string;
  clerkId: string; // ID from Clerk
  preferences: UserPreferences;
  medicalProfile: UserMedicalProfile;
  createdAt: Date;
  updatedAt: Date;
}

interface UserPreferences {
  displayUnit: 'A1C' | 'AG';
  targetA1C?: number;
  reminderEnabled: boolean;
  reminderFrequency: 'DAILY' | 'TWICE_DAILY' | 'WEEKLY' | 'CUSTOM';
  theme: 'light' | 'dark' | 'system';
}

interface UserMedicalProfile {
  diabetesType?: 'TYPE_1' | 'TYPE_2' | 'GESTATIONAL' | 'PREDIABETES' | 'OTHER';
  birthYear?: number;
  targetA1C?: number;
  preferredUnit: 'MGDL' | 'MMOLL';
}
```

#### GlucoseReading

```typescript
interface GlucoseReading {
  id: string;
  userId: string;
  value: number; // in mg/dl
  timestamp: Date;
  mealContext:
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
  notes?: string;
  runId?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

#### Run

```typescript
interface Run {
  id: string;
  userId: string;
  name: string;
  startDate: Date;
  endDate: Date;
  calculatedA1C: number | null;
  averageGlucose: number | null;
  monthId: string | null;
  createdAt: Date;
  updatedAt: Date;
}
```

#### Month

```typescript
interface Month {
  id: string;
  userId: string;
  name: string;
  startDate: Date;
  endDate: Date;
  calculatedA1C: number | null;
  averageGlucose: number | null;
  runIds: string[];
  createdAt: Date;
  updatedAt: Date;
}
```

#### JobQueue

```typescript
interface JobQueue {
  id: string;
  jobType: 'CALCULATE_A1C' | 'SEND_REMINDER' | 'GENERATE_REPORT';
  payload: Record<string, any>;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  createdAt: Date;
  updatedAt: Date;
  processedAt?: Date;
  error?: string;
}
```

## Database Schema

### Entities

#### User Table

| Field     | Type     | Description                             |
| --------- | -------- | --------------------------------------- |
| id        | UUID     | Primary key                             |
| email     | String   | User's email address (unique)           |
| name      | String   | User's full name (optional)             |
| clerkId   | String   | ID from authentication provider (Clerk) |
| createdAt | DateTime | When the user was created               |
| updatedAt | DateTime | When the user was last updated          |

#### GlucoseReading Table

| Field       | Type     | Description                      |
| ----------- | -------- | -------------------------------- |
| id          | UUID     | Primary key                      |
| userId      | UUID     | Foreign key to User              |
| value       | Float    | Glucose reading value in mg/dL   |
| timestamp   | DateTime | When the reading was taken       |
| mealContext | Enum     | Context of the reading           |
| notes       | String   | Optional notes about the reading |
| runId       | UUID     | Foreign key to Run (optional)    |
| createdAt   | DateTime | When the record was created      |
| updatedAt   | DateTime | When the record was last updated |

#### Run Table

| Field          | Type     | Description                        |
| -------------- | -------- | ---------------------------------- |
| id             | UUID     | Primary key                        |
| userId         | UUID     | Foreign key to User                |
| name           | String   | Name of the run                    |
| startDate      | DateTime | Start date of the run              |
| endDate        | DateTime | End date of the run                |
| calculatedA1C  | Float    | Calculated A1C value for this run  |
| averageGlucose | Float    | Average glucose value for this run |
| monthId        | UUID     | Foreign key to Month (optional)    |
| createdAt      | DateTime | When the record was created        |
| updatedAt      | DateTime | When the record was last updated   |

#### Month Table

| Field          | Type     | Description                          |
| -------------- | -------- | ------------------------------------ |
| id             | UUID     | Primary key                          |
| userId         | UUID     | Foreign key to User                  |
| name           | String   | Name of the month                    |
| startDate      | DateTime | Start date of the month              |
| endDate        | DateTime | End date of the month                |
| calculatedA1C  | Float    | Calculated A1C value for this month  |
| averageGlucose | Float    | Average glucose value for this month |
| createdAt      | DateTime | When the record was created          |
| updatedAt      | DateTime | When the record was last updated     |

#### UserPreferences Table

| Field             | Type     | Description                        |
| ----------------- | -------- | ---------------------------------- |
| id                | UUID     | Primary key                        |
| userId            | UUID     | Foreign key to User (unique)       |
| displayUnit       | Enum     | Preferred display unit (A1C or AG) |
| targetA1C         | Float    | User's target A1C value (optional) |
| reminderEnabled   | Boolean  | Whether reminders are enabled      |
| reminderFrequency | Enum     | Frequency of reminders             |
| theme             | Enum     | UI theme preference                |
| createdAt         | DateTime | When the record was created        |
| updatedAt         | DateTime | When the record was last updated   |

#### UserMedicalProfile Table

| Field         | Type     | Description                        |
| ------------- | -------- | ---------------------------------- |
| id            | UUID     | Primary key                        |
| userId        | UUID     | Foreign key to User (unique)       |
| diabetesType  | Enum     | Type of diabetes                   |
| birthYear     | Integer  | User's birth year (optional)       |
| targetA1C     | Float    | User's target A1C value (optional) |
| preferredUnit | Enum     | Preferred glucose unit             |
| createdAt     | DateTime | When the record was created        |
| updatedAt     | DateTime | When the record was last updated   |

#### JobQueue Table

| Field       | Type     | Description                            |
| ----------- | -------- | -------------------------------------- |
| id          | UUID     | Primary key                            |
| jobType     | Enum     | Type of job to process                 |
| payload     | JSONB    | Data needed to process the job         |
| status      | Enum     | Current status of the job              |
| createdAt   | DateTime | When the job was created               |
| updatedAt   | DateTime | When the job was last updated          |
| processedAt | DateTime | When the job was processed (optional)  |
| error       | String   | Error message if job failed (optional) |

### Relationships

- **User** 1:N **GlucoseReading** - A user can have many glucose readings
- **User** 1:N **Run** - A user can have many runs
- **User** 1:N **Month** - A user can have many months
- **User** 1:1 **UserPreferences** - A user has one set of preferences
- **User** 1:1 **UserMedicalProfile** - A user has one medical profile
- **Run** 1:N **GlucoseReading** - A run can contain many glucose readings
- **Month** 1:N **Run** - A month can contain many runs

## Background Processing with Supabase

### Job Queue Implementation

The application uses Supabase's PostgreSQL database to implement a job queue for background processing tasks:

```sql
-- Create job queue table
CREATE TABLE job_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT DEFAULT 'PENDING',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  error TEXT
);

-- Add indexes for faster queries
CREATE INDEX idx_job_queue_status ON job_queue(status);
CREATE INDEX idx_job_queue_type ON job_queue(job_type);
```

### Processing Jobs

Jobs are processed using a combination of:

1. **Scheduled Database Functions**: Using pg_cron to run periodic tasks
2. **Edge Functions**: For more complex processing needs

#### Example Database Function for A1C Calculation

```sql
-- Function to process pending A1C calculation jobs
CREATE OR REPLACE FUNCTION process_a1c_calculation_jobs()
RETURNS void AS $$
DECLARE
  job RECORD;
BEGIN
  -- Get pending jobs
  FOR job IN
    SELECT * FROM job_queue
    WHERE status = 'PENDING' AND job_type = 'CALCULATE_A1C'
    ORDER BY created_at ASC
    LIMIT 10
  LOOP
    -- Mark as processing
    UPDATE job_queue SET status = 'PROCESSING', updated_at = NOW()
    WHERE id = job.id;

    BEGIN
      -- Calculate A1C for the run
      WITH readings AS (
        SELECT value FROM glucose_readings
        WHERE run_id = (job.payload->>'runId')::uuid
      )
      UPDATE runs
      SET
        calculated_a1c = ((SELECT AVG(value) FROM readings) + 46.7) / 28.7,
        average_glucose = (SELECT AVG(value) FROM readings),
        updated_at = NOW()
      WHERE id = (job.payload->>'runId')::uuid;

      -- Mark job as completed
      UPDATE job_queue
      SET status = 'COMPLETED', updated_at = NOW(), processed_at = NOW()
      WHERE id = job.id;

    EXCEPTION WHEN OTHERS THEN
      -- Mark job as failed
      UPDATE job_queue
      SET status = 'FAILED', updated_at = NOW(), error = SQLERRM
      WHERE id = job.id;
    END;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Schedule the function to run every minute
SELECT cron.schedule('* * * * *', 'SELECT process_a1c_calculation_jobs()');
```

### Adding Jobs to the Queue

Jobs are added to the queue from Next.js API routes or Server Actions:

```typescript
// Example: Adding a job to calculate A1C after adding a glucose reading
async function addGlucoseReading(data) {
  const supabase = createClient();

  // First, insert the reading
  const { data: reading, error } = await supabase
    .from('glucose_readings')
    .insert({
      user_id: data.userId,
      value: data.value,
      timestamp: data.timestamp,
      meal_context: data.mealContext,
      notes: data.notes,
      run_id: data.runId,
    })
    .select()
    .single();

  if (error) throw error;

  // If this reading is part of a run, queue an A1C calculation job
  if (data.runId) {
    await supabase.from('job_queue').insert({
      job_type: 'CALCULATE_A1C',
      payload: {
        runId: data.runId,
        userId: data.userId,
      },
    });
  }

  return reading;
}
```

## API Endpoints

### Authentication

- `GET /api/auth/[...clerk]` - Clerk authentication handlers

### Glucose Readings

- `GET /api/readings` - Get all readings for current user
- `POST /api/readings` - Create new reading
- `GET /api/readings/:id` - Get specific reading
- `PUT /api/readings/:id` - Update reading
- `DELETE /api/readings/:id` - Delete reading

### Runs

- `GET /api/runs` - Get all runs for current user
- `POST /api/runs` - Create new run
- `GET /api/runs/:id` - Get specific run with readings
- `PUT /api/runs/:id` - Update run
- `DELETE /api/runs/:id` - Delete run
- `POST /api/runs/:id/calculate` - Calculate A1C for run

### Months

- `GET /api/months` - Get all months for current user
- `POST /api/months` - Create new month
- `GET /api/months/:id` - Get specific month with runs
- `PUT /api/months/:id` - Update month
- `DELETE /api/months/:id` - Delete month
- `POST /api/months/:id/calculate` - Calculate A1C for month

## Authentication Implementation

### Clerk Authentication

The application uses Clerk for authentication with the following features:

- Email/password authentication
- Social login (Google, Apple)
- Magic links
- Two-factor authentication
- User profile management

### Authentication Flow

1. User signs in through Clerk
2. Clerk provides a session token
3. Next.js middleware verifies the session
4. User information is stored in the Supabase database

## A1C Calculation Algorithm

The application uses a formula based on scientific research to convert average glucose readings to an estimated A1C percentage:

```
A1C = (Average Glucose + 46.7) / 28.7
```

The calculation process involves:

1. Validating input data (time order, value ranges)
2. Sorting and organizing readings
3. Calculating weighted averages
4. Converting to A1C using the formula
5. Formatting and displaying results

## Deployment Architecture

### Vercel Deployment

The application is deployed on Vercel with the following configuration:

- Next.js application with serverless functions
- Environment variables for Clerk and Supabase credentials
- Automatic preview deployments for pull requests
- Production branch deployment with custom domain

### Supabase Configuration

- PostgreSQL database with RLS policies for security
- Database functions for background processing
- Storage buckets for user files
- Scheduled jobs using pg_cron

## Security Considerations

1. **Authentication**: Secure authentication with Clerk
2. **Authorization**: Row-level security in Supabase
3. **Data Encryption**: Encrypt sensitive health data at rest and in transit
4. **Input Validation**: Validate all user inputs with Zod
5. **CORS**: Configure proper CORS policies
6. **Rate Limiting**: Implement rate limiting with Vercel Edge Config
7. **Audit Logging**: Log all data access and modifications

## Performance Considerations

1. **Caching**: Implement caching for frequently accessed data
2. **Pagination**: Use pagination for large data sets
3. **Lazy Loading**: Implement lazy loading for components and data
4. **Code Splitting**: Split code into smaller chunks for faster loading
5. **Image Optimization**: Use Next.js Image component
6. **Database Indexing**: Create proper indexes for database queries
7. **Server Components**: Use React Server Components for initial page loads

## Accessibility Considerations

1. **WCAG Compliance**: Follow WCAG 2.1 AA guidelines
2. **Keyboard Navigation**: Ensure all features are accessible via keyboard
3. **Screen Reader Support**: Test with screen readers
4. **Color Contrast**: Ensure sufficient contrast for text and UI elements
5. **Focus Management**: Implement proper focus management
6. **Responsive Design**: Ensure accessibility across all device sizes
7. **Alternative Text**: Provide alt text for all images

## Testing Strategy

### Unit Testing

- Test individual components and functions
- Validate calculation algorithms
- Verify form validation

### Integration Testing

- Test API endpoints
- Verify data flow between components
- Test database operations

### End-to-End Testing

- Test complete user flows
- Verify authentication and authorization
- Test across different devices and browsers

### Performance Testing

- Optimize component rendering
- Test with large datasets
- Verify responsiveness on mobile devices

## Implementation Approach

1. **Feature-First Organization**: Organize code by feature rather than type
2. **Test-Driven Development**: Write tests before implementing features
3. **Continuous Integration**: Set up CI/CD pipeline for automated testing and deployment
4. **Documentation**: Document code, APIs, and architecture
5. **Code Reviews**: Implement peer code reviews for all changes
6. **Iterative Development**: Build incrementally with regular feedback cycles

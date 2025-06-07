import { z } from 'zod';
import type { MealContext } from '@/types/glucose';

// Define the valid meal contexts
const mealContextEnum = z.enum([
  'BEFORE_BREAKFAST',
  'AFTER_BREAKFAST',
  'BEFORE_LUNCH',
  'AFTER_LUNCH',
  'BEFORE_DINNER',
  'AFTER_DINNER',
  'BEDTIME',
  'WAKEUP',
  'FASTING',
  'OTHER'
]);

// Schema for creating/updating a glucose reading
export const glucoseReadingSchema = z.object({
  value: z.coerce
    .number()
    .positive('Glucose value must be a positive number')
    .max(1000, 'Glucose value cannot exceed 1000 mg/dL'),
  
  timestamp: z.string()
    .refine(
      (dateStr) => {
        try {
          // Parse the date string to ensure it's valid
          const date = new Date(dateStr);
          return !isNaN(date.getTime());
        } catch (e) {
          return false;
        }
      },
      'Invalid date format'
    )
    .refine(
      (dateStr) => {
        const date = new Date(dateStr);
        const now = new Date();
        // Compare only the date parts to avoid millisecond precision issues
        return date <= now;
      },
      'Timestamp cannot be in the future'
    ),
  
  mealContext: mealContextEnum,
  
  notes: z.string()
    .max(1000, 'Notes cannot exceed 1000 characters')
    .optional(),
  
  runId: z.string().optional()
});

// Type for the validated glucose reading input
export type GlucoseReadingInput = z.infer<typeof glucoseReadingSchema>;

// Schema for API responses
export const glucoseReadingResponseSchema = glucoseReadingSchema.extend({
  id: z.string(),
  userId: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

// Type for the glucose reading response
export type GlucoseReadingResponse = z.infer<typeof glucoseReadingResponseSchema>;
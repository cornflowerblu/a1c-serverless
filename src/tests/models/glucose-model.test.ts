import { describe, it, expect } from 'vitest';
import type { GlucoseReading, MealContext } from '@/types/glucose';

describe('Glucose Reading Data Model', () => {
  // Test the structure and types of the GlucoseReading interface
  it('should have the correct structure and types', () => {
    const reading: GlucoseReading = {
      id: '123',
      userId: 'user123',
      value: 120,
      timestamp: new Date(),
      mealContext: 'FASTING',
      notes: 'Test reading',
      runId: 'run123',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Verify all required properties exist
    expect(reading).toHaveProperty('id');
    expect(reading).toHaveProperty('userId');
    expect(reading).toHaveProperty('value');
    expect(reading).toHaveProperty('timestamp');
    expect(reading).toHaveProperty('mealContext');
    expect(reading).toHaveProperty('createdAt');
    expect(reading).toHaveProperty('updatedAt');

    // Verify types
    expect(typeof reading.id).toBe('string');
    expect(typeof reading.userId).toBe('string');
    expect(typeof reading.value).toBe('number');
    expect(reading.timestamp).toBeInstanceOf(Date);
    expect(typeof reading.mealContext).toBe('string');
    expect(reading.createdAt).toBeInstanceOf(Date);
    expect(reading.updatedAt).toBeInstanceOf(Date);

    // Optional properties
    expect(typeof reading.notes).toBe('string');
    expect(typeof reading.runId).toBe('string');
  });

  // Test all possible meal context values
  it('should accept all valid meal context values', () => {
    const validMealContexts: MealContext[] = [
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
    ];

    validMealContexts.forEach(context => {
      const reading: GlucoseReading = {
        id: '123',
        userId: 'user123',
        value: 120,
        timestamp: new Date(),
        mealContext: context,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      expect(reading.mealContext).toBe(context);
    });
  });

  // Test database to model transformation
  it('should transform database format to model format correctly', () => {
    const dbReading = {
      id: '123',
      user_id: 'user123',
      value: 120,
      timestamp: '2023-05-01T12:00:00.000Z',
      meal_context: 'FASTING',
      notes: 'Test reading',
      run_id: 'run123',
      created_at: '2023-05-01T12:00:00.000Z',
      updated_at: '2023-05-01T12:00:00.000Z'
    };

    // This simulates the transformation logic in the API
    const modelReading: GlucoseReading = {
      id: dbReading.id,
      userId: dbReading.user_id,
      value: dbReading.value,
      timestamp: new Date(dbReading.timestamp),
      mealContext: dbReading.meal_context as MealContext,
      notes: dbReading.notes,
      runId: dbReading.run_id,
      createdAt: new Date(dbReading.created_at),
      updatedAt: new Date(dbReading.updated_at)
    };

    expect(modelReading.id).toBe(dbReading.id);
    expect(modelReading.userId).toBe(dbReading.user_id);
    expect(modelReading.value).toBe(dbReading.value);
    expect(modelReading.timestamp.toISOString()).toBe(dbReading.timestamp);
    expect(modelReading.mealContext).toBe(dbReading.meal_context);
    expect(modelReading.notes).toBe(dbReading.notes);
    expect(modelReading.runId).toBe(dbReading.run_id);
    expect(modelReading.createdAt.toISOString()).toBe(dbReading.created_at);
    expect(modelReading.updatedAt.toISOString()).toBe(dbReading.updated_at);
  });
});
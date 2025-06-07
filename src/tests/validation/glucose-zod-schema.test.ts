import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { glucoseReadingSchema } from '@/utils/schemas/glucose-schema';

describe('Glucose Reading Zod Schema Validation', () => {
  // Test valid data passes validation
  it('should validate a correct glucose reading', () => {
    const validReading = {
      value: 120,
      timestamp: new Date().toISOString(),
      mealContext: 'FASTING',
      notes: 'Morning reading'
    };
    
    const result = glucoseReadingSchema.safeParse(validReading);
    expect(result.success).toBe(true);
    
    if (result.success) {
      expect(result.data).toEqual(validReading);
    }
  });
  
  // Test required fields
  it('should require value, timestamp, and mealContext', () => {
    const incompleteReading = {
      notes: 'Missing required fields'
    };
    
    const result = glucoseReadingSchema.safeParse(incompleteReading);
    expect(result.success).toBe(false);
    
    if (!result.success) {
      const formattedErrors = result.error.format();
      expect(formattedErrors.value?._errors).toBeDefined();
      expect(formattedErrors.timestamp?._errors).toBeDefined();
      expect(formattedErrors.mealContext?._errors).toBeDefined();
    }
  });
  
  // Test value constraints
  it('should validate glucose value is a positive number', () => {
    // Test negative value
    const negativeValueReading = {
      value: -50,
      timestamp: new Date().toISOString(),
      mealContext: 'FASTING'
    };
    
    let result = glucoseReadingSchema.safeParse(negativeValueReading);
    expect(result.success).toBe(false);
    
    // Test zero value
    const zeroValueReading = {
      value: 0,
      timestamp: new Date().toISOString(),
      mealContext: 'FASTING'
    };
    
    result = glucoseReadingSchema.safeParse(zeroValueReading);
    expect(result.success).toBe(false);
    
    // Test non-numeric value
    const nonNumericValueReading = {
      value: 'not-a-number',
      timestamp: new Date().toISOString(),
      mealContext: 'FASTING'
    };
    
    result = glucoseReadingSchema.safeParse(nonNumericValueReading);
    expect(result.success).toBe(false);
    
    // Test valid value
    const validValueReading = {
      value: 120,
      timestamp: new Date().toISOString(),
      mealContext: 'FASTING'
    };
    
    result = glucoseReadingSchema.safeParse(validValueReading);
    expect(result.success).toBe(true);
  });
  
  // Test timestamp constraints
  it('should validate timestamp is not in the future', () => {
    const now = new Date();
    
    // Test future timestamp
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);
    
    const futureReading = {
      value: 120,
      timestamp: futureDate.toISOString(),
      mealContext: 'FASTING'
    };
    
    let result = glucoseReadingSchema.safeParse(futureReading);
    expect(result.success).toBe(false);
    
    // Test current timestamp
    const currentReading = {
      value: 120,
      timestamp: now.toISOString(),
      mealContext: 'FASTING'
    };
    
    result = glucoseReadingSchema.safeParse(currentReading);
    expect(result.success).toBe(true);
    
    // Test past timestamp
    const pastDate = new Date();
    pastDate.setFullYear(pastDate.getFullYear() - 1);
    
    const pastReading = {
      value: 120,
      timestamp: pastDate.toISOString(),
      mealContext: 'FASTING'
    };
    
    result = glucoseReadingSchema.safeParse(pastReading);
    expect(result.success).toBe(true);
  });
  
  // Test meal context validation
  it('should validate meal context is one of the allowed values', () => {
    const validMealContexts = [
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
    
    // Test each valid meal context
    validMealContexts.forEach(context => {
      const reading = {
        value: 120,
        timestamp: new Date().toISOString(),
        mealContext: context
      };
      
      const result = glucoseReadingSchema.safeParse(reading);
      expect(result.success).toBe(true);
    });
    
    // Test invalid meal context
    const invalidReading = {
      value: 120,
      timestamp: new Date().toISOString(),
      mealContext: 'INVALID_CONTEXT'
    };
    
    const result = glucoseReadingSchema.safeParse(invalidReading);
    expect(result.success).toBe(false);
  });
  
  // Test optional notes field
  it('should allow optional notes field', () => {
    // Without notes
    const readingWithoutNotes = {
      value: 120,
      timestamp: new Date().toISOString(),
      mealContext: 'FASTING'
    };
    
    let result = glucoseReadingSchema.safeParse(readingWithoutNotes);
    expect(result.success).toBe(true);
    
    // With notes
    const readingWithNotes = {
      value: 120,
      timestamp: new Date().toISOString(),
      mealContext: 'FASTING',
      notes: 'Test notes'
    };
    
    result = glucoseReadingSchema.safeParse(readingWithNotes);
    expect(result.success).toBe(true);
    
    if (result.success) {
      expect(result.data.notes).toBe('Test notes');
    }
  });
  
  // Test notes length constraint
  it('should validate notes length', () => {
    // Generate a string that's too long (e.g., 1001 characters)
    const longNotes = 'a'.repeat(1001);
    
    const readingWithLongNotes = {
      value: 120,
      timestamp: new Date().toISOString(),
      mealContext: 'FASTING',
      notes: longNotes
    };
    
    const result = glucoseReadingSchema.safeParse(readingWithLongNotes);
    expect(result.success).toBe(false);
    
    if (!result.success) {
      const formattedErrors = result.error.format();
      expect(formattedErrors.notes?._errors).toBeDefined();
    }
  });
  
  // Test type coercion
  it('should coerce string values to numbers for the value field', () => {
    const readingWithStringValue = {
      value: '120', // String instead of number
      timestamp: new Date().toISOString(),
      mealContext: 'FASTING'
    };
    
    const result = glucoseReadingSchema.safeParse(readingWithStringValue);
    expect(result.success).toBe(true);
    
    if (result.success) {
      expect(typeof result.data.value).toBe('number');
      expect(result.data.value).toBe(120);
    }
  });
});
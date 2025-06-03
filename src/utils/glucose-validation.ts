import type { GlucoseReading, MealContext } from '../types/glucose';

const VALID_MEAL_CONTEXTS: MealContext[] = [
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

const MIN_GLUCOSE_VALUE = 0;
const MAX_GLUCOSE_VALUE = 1000; // Extremely high but possible in severe cases

/**
 * Validates a single glucose reading
 * 
 * @param reading - The glucose reading to validate
 * @returns True if the reading is valid, false otherwise
 */
export function validateGlucoseReading(reading: GlucoseReading): boolean {
  // Check for valid glucose value range
  if (reading.value < MIN_GLUCOSE_VALUE || reading.value > MAX_GLUCOSE_VALUE) {
    return false;
  }
  
  // Check for valid meal context
  if (!VALID_MEAL_CONTEXTS.includes(reading.mealContext)) {
    return false;
  }
  
  // Check that timestamp is not in the future
  const now = new Date();
  if (reading.timestamp > now) {
    return false;
  }
  
  return true;
}

/**
 * Validates an array of glucose readings
 * 
 * @param readings - Array of glucose readings to validate
 * @returns True if all readings are valid, false otherwise
 */
export function validateGlucoseReadings(readings: GlucoseReading[]): boolean {
  if (readings.length === 0) {
    return true;
  }
  
  // Check that all readings are valid
  for (const reading of readings) {
    if (!validateGlucoseReading(reading)) {
      return false;
    }
  }
  
  // Check that all readings belong to the same user
  const userId = readings[0].userId;
  return readings.every(reading => reading.userId === userId);
}

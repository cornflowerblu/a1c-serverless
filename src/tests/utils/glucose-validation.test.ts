import { describe, it, expect } from 'vitest';
import { validateGlucoseReading, validateGlucoseReadings } from '../../utils/glucose-validation';
import type { GlucoseReading } from '../../types/glucose';

describe('Glucose Validation', () => {
  describe('validateGlucoseReading', () => {
    it('should validate a valid glucose reading', () => {
      const validReading: GlucoseReading = {
        id: '1',
        userId: 'user1',
        value: 120,
        timestamp: new Date(),
        mealContext: 'FASTING',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      expect(validateGlucoseReading(validReading)).toBe(true);
    });
    
    it('should reject readings with invalid glucose values', () => {
      const invalidReadings = [
        // Negative value
        {
          id: '1',
          userId: 'user1',
          value: -10,
          timestamp: new Date(),
          mealContext: 'FASTING',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        // Extremely high value (unrealistic)
        {
          id: '2',
          userId: 'user1',
          value: 1001,
          timestamp: new Date(),
          mealContext: 'FASTING',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];
      
      expect(validateGlucoseReading(invalidReadings[0] as GlucoseReading)).toBe(false);
      expect(validateGlucoseReading(invalidReadings[1] as GlucoseReading)).toBe(false);
    });
    
    it('should reject readings with invalid meal context', () => {
      const invalidReading = {
        id: '1',
        userId: 'user1',
        value: 120,
        timestamp: new Date(),
        mealContext: 'INVALID_CONTEXT',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      expect(validateGlucoseReading(invalidReading as never)).toBe(false);
    });
    
    it('should reject readings with future timestamps', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1); // Tomorrow
      
      const invalidReading: GlucoseReading = {
        id: '1',
        userId: 'user1',
        value: 120,
        timestamp: futureDate,
        mealContext: 'FASTING',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      expect(validateGlucoseReading(invalidReading)).toBe(false);
    });
  });
  
  describe('validateGlucoseReadings', () => {
    it('should validate an array of valid readings', () => {
      const validReadings: GlucoseReading[] = [
        {
          id: '1',
          userId: 'user1',
          value: 120,
          timestamp: new Date(),
          mealContext: 'FASTING',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: '2',
          userId: 'user1',
          value: 140,
          timestamp: new Date(),
          mealContext: 'AFTER_BREAKFAST',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];
      
      expect(validateGlucoseReadings(validReadings)).toBe(true);
    });
    
    it('should reject if any reading is invalid', () => {
      const readings: GlucoseReading[] = [
        {
          id: '1',
          userId: 'user1',
          value: 120,
          timestamp: new Date(),
          mealContext: 'FASTING',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: '2',
          userId: 'user1',
          value: -50, // Invalid negative value
          timestamp: new Date(),
          mealContext: 'AFTER_BREAKFAST',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];
      
      expect(validateGlucoseReadings(readings)).toBe(false);
    });
    
    it('should validate an empty array', () => {
      expect(validateGlucoseReadings([])).toBe(true);
    });
    
    it('should reject readings from different users', () => {
      const mixedUserReadings: GlucoseReading[] = [
        {
          id: '1',
          userId: 'user1',
          value: 120,
          timestamp: new Date(),
          mealContext: 'FASTING',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: '2',
          userId: 'user2', // Different user
          value: 140,
          timestamp: new Date(),
          mealContext: 'AFTER_BREAKFAST',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];
      
      expect(validateGlucoseReadings(mixedUserReadings)).toBe(false);
    });
  });
});

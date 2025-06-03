import { describe, it, expect } from 'vitest';
import { calculateA1C, calculateAverageGlucose } from '../../utils/a1c-calculator';
import type { GlucoseReading } from '../../types/glucose';

describe('A1C Calculator', () => {
  describe('calculateA1C', () => {
    it('should calculate A1C from average glucose value', () => {
      // Test with common glucose values
      expect(calculateA1C(100)).toBeCloseTo(5.1, 1); // ~5.1%
      expect(calculateA1C(126)).toBeCloseTo(6.0, 1); // ~6.0%
      expect(calculateA1C(154)).toBeCloseTo(7.0, 1); // ~7.0%
      expect(calculateA1C(183)).toBeCloseTo(8.0, 1); // ~8.0%
      expect(calculateA1C(212)).toBeCloseTo(9.0, 1); // ~9.0%
    });

    it('should handle edge cases', () => {
      // Very low glucose (hypoglycemia)
      expect(calculateA1C(40)).toBeCloseTo(3.0, 1);
      
      // Very high glucose (severe hyperglycemia)
      expect(calculateA1C(400)).toBeCloseTo(15.6, 1);
      
      // Zero (invalid but should not break)
      expect(calculateA1C(0)).toBeCloseTo(1.6, 1);
    });

    it('should handle invalid inputs', () => {
      // Negative values (invalid but should return a reasonable result)
      expect(() => calculateA1C(-100)).toThrow();
      
      // NaN
      expect(() => calculateA1C(NaN)).toThrow();
    });
  });

  describe('calculateAverageGlucose', () => {
    it('should calculate average glucose from an array of readings', () => {
      const readings: GlucoseReading[] = [
        { id: '1', userId: 'user1', value: 100, timestamp: new Date(), mealContext: 'FASTING', createdAt: new Date(), updatedAt: new Date() },
        { id: '2', userId: 'user1', value: 120, timestamp: new Date(), mealContext: 'AFTER_BREAKFAST', createdAt: new Date(), updatedAt: new Date() },
        { id: '3', userId: 'user1', value: 140, timestamp: new Date(), mealContext: 'BEFORE_LUNCH', createdAt: new Date(), updatedAt: new Date() },
      ];
      
      expect(calculateAverageGlucose(readings)).toBe(120);
    });

    it('should return 0 for empty array', () => {
      expect(calculateAverageGlucose([])).toBe(0);
    });

    it('should handle readings with different weights', () => {
      const readings: GlucoseReading[] = [
        { id: '1', userId: 'user1', value: 100, timestamp: new Date(), mealContext: 'FASTING', createdAt: new Date(), updatedAt: new Date() },
        { id: '2', userId: 'user1', value: 200, timestamp: new Date(), mealContext: 'AFTER_BREAKFAST', createdAt: new Date(), updatedAt: new Date() },
      ];
      
      // Default equal weights
      expect(calculateAverageGlucose(readings)).toBe(150);
      
      // Custom weights (fasting readings weighted more)
      const weights = {
        'FASTING': 2,
        'AFTER_BREAKFAST': 1
      };
      
      // Weighted average: (100*2 + 200*1) / (2+1) = 400/3 = 133.33
      expect(calculateAverageGlucose(readings, weights)).toBeCloseTo(133.33, 2);
    });
  });
});

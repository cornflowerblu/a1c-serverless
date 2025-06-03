import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMonth, addRunToMonth, calculateMonthStatistics } from '../../utils/month-management';
import type { Run, Month } from '../../types/glucose';

// Mock the A1C calculator functions
vi.mock('../../utils/a1c-calculator', () => ({
  calculateA1C: vi.fn((avg) => (avg + 46.7) / 28.7),
  calculateAverageGlucose: vi.fn((readings) => {
    if (readings.length === 0) return 0;
    return readings.reduce((sum, r) => sum + r.value, 0) / readings.length;
  })
}));

describe('Month Management', () => {
  let mockDate: Date;
  
  beforeEach(() => {
    mockDate = new Date('2025-01-01T12:00:00Z');
    vi.useFakeTimers();
    vi.setSystemTime(mockDate);
  });
  
  afterEach(() => {
    vi.useRealTimers();
  });
  
  describe('createMonth', () => {
    it('should create a new month with default values', () => {
      const userId = 'user123';
      const name = 'January 2025';
      
      const month = createMonth(userId, name);
      
      expect(month).toEqual({
        id: expect.any(String),
        userId,
        name,
        startDate: mockDate,
        endDate: mockDate,
        calculatedA1C: null,
        averageGlucose: null,
        runIds: [],
        createdAt: mockDate,
        updatedAt: mockDate
      });
    });
    
    it('should create a month with custom dates', () => {
      const userId = 'user123';
      const name = 'January 2025';
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-31');
      
      const month = createMonth(userId, name, startDate, endDate);
      
      expect(month).toEqual({
        id: expect.any(String),
        userId,
        name,
        startDate,
        endDate,
        calculatedA1C: null,
        averageGlucose: null,
        runIds: [],
        createdAt: mockDate,
        updatedAt: mockDate
      });
    });
    
    it('should throw an error if end date is before start date', () => {
      const userId = 'user123';
      const name = 'Invalid Month';
      const startDate = new Date('2025-01-31');
      const endDate = new Date('2025-01-01');
      
      expect(() => createMonth(userId, name, startDate, endDate)).toThrow();
    });
  });
  
  describe('addRunToMonth', () => {
    it('should add a run to a month', () => {
      const month: Month = {
        id: 'month1',
        userId: 'user123',
        name: 'January 2025',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-31'),
        calculatedA1C: null,
        averageGlucose: null,
        runIds: [],
        createdAt: mockDate,
        updatedAt: mockDate
      };
      
      const run: Run = {
        id: 'run1',
        userId: 'user123',
        name: 'Week 1',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-07'),
        calculatedA1C: 5.5,
        averageGlucose: 120,
        monthId: null,
        createdAt: mockDate,
        updatedAt: mockDate
      };
      
      const result = addRunToMonth(run, month);
      
      expect(result.month.runIds).toContain(run.id);
      expect(result.run.monthId).toBe(month.id);
    });
    
    it('should throw an error if run is outside month date range', () => {
      const month: Month = {
        id: 'month1',
        userId: 'user123',
        name: 'January 2025',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-31'),
        calculatedA1C: null,
        averageGlucose: null,
        runIds: [],
        createdAt: mockDate,
        updatedAt: mockDate
      };
      
      const run: Run = {
        id: 'run1',
        userId: 'user123',
        name: 'February Week 1',
        startDate: new Date('2025-02-01'), // Outside month range
        endDate: new Date('2025-02-07'),
        calculatedA1C: 5.5,
        averageGlucose: 120,
        monthId: null,
        createdAt: mockDate,
        updatedAt: mockDate
      };
      
      expect(() => addRunToMonth(run, month)).toThrow();
    });
    
    it('should throw an error if run is from a different user', () => {
      const month: Month = {
        id: 'month1',
        userId: 'user123',
        name: 'January 2025',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-31'),
        calculatedA1C: null,
        averageGlucose: null,
        runIds: [],
        createdAt: mockDate,
        updatedAt: mockDate
      };
      
      const run: Run = {
        id: 'run1',
        userId: 'differentUser', // Different user
        name: 'Week 1',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-07'),
        calculatedA1C: 5.5,
        averageGlucose: 120,
        monthId: null,
        createdAt: mockDate,
        updatedAt: mockDate
      };
      
      expect(() => addRunToMonth(run, month)).toThrow();
    });
    
    it('should not add duplicate run IDs', () => {
      const month: Month = {
        id: 'month1',
        userId: 'user123',
        name: 'January 2025',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-31'),
        calculatedA1C: null,
        averageGlucose: null,
        runIds: ['run1'], // Already contains the run ID
        createdAt: mockDate,
        updatedAt: mockDate
      };
      
      const run: Run = {
        id: 'run1',
        userId: 'user123',
        name: 'Week 1',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-07'),
        calculatedA1C: 5.5,
        averageGlucose: 120,
        monthId: 'month1', // Already associated with the month
        createdAt: mockDate,
        updatedAt: mockDate
      };
      
      const result = addRunToMonth(run, month);
      
      expect(result.month.runIds).toEqual(['run1']); // No duplicates
      expect(result.month.runIds.length).toBe(1);
    });
  });
  
  describe('calculateMonthStatistics', () => {
    it('should calculate A1C and average glucose for a month based on runs', () => {
      const runs: Run[] = [
        {
          id: 'run1',
          userId: 'user123',
          name: 'Week 1',
          startDate: new Date('2025-01-01'),
          endDate: new Date('2025-01-07'),
          calculatedA1C: 5.5,
          averageGlucose: 120,
          monthId: 'month1',
          createdAt: mockDate,
          updatedAt: mockDate
        },
        {
          id: 'run2',
          userId: 'user123',
          name: 'Week 2',
          startDate: new Date('2025-01-08'),
          endDate: new Date('2025-01-14'),
          calculatedA1C: 6.0,
          averageGlucose: 140,
          monthId: 'month1',
          createdAt: mockDate,
          updatedAt: mockDate
        }
      ];
      
      const month: Month = {
        id: 'month1',
        userId: 'user123',
        name: 'January 2025',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-31'),
        calculatedA1C: null,
        averageGlucose: null,
        runIds: ['run1', 'run2'],
        createdAt: mockDate,
        updatedAt: mockDate
      };
      
      const updatedMonth = calculateMonthStatistics(month, runs);
      
      // Average glucose: (120 + 140) / 2 = 130
      // A1C: (130 + 46.7) / 28.7 = 6.16
      expect(updatedMonth.averageGlucose).toBe(130);
      expect(updatedMonth.calculatedA1C).toBeCloseTo(6.16, 2);
    });
    
    it('should handle empty runs array', () => {
      const runs: Run[] = [];
      
      const month: Month = {
        id: 'month1',
        userId: 'user123',
        name: 'January 2025',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-31'),
        calculatedA1C: null,
        averageGlucose: null,
        runIds: [],
        createdAt: mockDate,
        updatedAt: mockDate
      };
      
      const updatedMonth = calculateMonthStatistics(month, runs);
      
      expect(updatedMonth.averageGlucose).toBe(0);
      expect(updatedMonth.calculatedA1C).toBeCloseTo(1.63, 2); // (0 + 46.7) / 28.7
    });
    
    it('should filter out runs that do not belong to the month', () => {
      const runs: Run[] = [
        {
          id: 'run1',
          userId: 'user123',
          name: 'Week 1',
          startDate: new Date('2025-01-01'),
          endDate: new Date('2025-01-07'),
          calculatedA1C: 5.5,
          averageGlucose: 120,
          monthId: 'month1', // Matches
          createdAt: mockDate,
          updatedAt: mockDate
        },
        {
          id: 'run2',
          userId: 'user123',
          name: 'Week 2',
          startDate: new Date('2025-01-08'),
          endDate: new Date('2025-01-14'),
          calculatedA1C: 6.0,
          averageGlucose: 140,
          monthId: 'month2', // Different month
          createdAt: mockDate,
          updatedAt: mockDate
        }
      ];
      
      const month: Month = {
        id: 'month1',
        userId: 'user123',
        name: 'January 2025',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-31'),
        calculatedA1C: null,
        averageGlucose: null,
        runIds: ['run1'],
        createdAt: mockDate,
        updatedAt: mockDate
      };
      
      const updatedMonth = calculateMonthStatistics(month, runs);
      
      // Should only use the first run with averageGlucose 120
      expect(updatedMonth.averageGlucose).toBe(120);
      expect(updatedMonth.calculatedA1C).toBeCloseTo(5.8, 1); // (120 + 46.7) / 28.7
    });
    
    it('should calculate weighted average based on run duration', () => {
      const runs: Run[] = [
        {
          id: 'run1',
          userId: 'user123',
          name: 'Week 1',
          startDate: new Date('2025-01-01'),
          endDate: new Date('2025-01-07'), // 7 days
          calculatedA1C: 5.5,
          averageGlucose: 120,
          monthId: 'month1',
          createdAt: mockDate,
          updatedAt: mockDate
        },
        {
          id: 'run2',
          userId: 'user123',
          name: 'Week 2-3',
          startDate: new Date('2025-01-08'),
          endDate: new Date('2025-01-21'), // 14 days
          calculatedA1C: 6.0,
          averageGlucose: 140,
          monthId: 'month1',
          createdAt: mockDate,
          updatedAt: mockDate
        }
      ];
      
      const month: Month = {
        id: 'month1',
        userId: 'user123',
        name: 'January 2025',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-31'),
        calculatedA1C: null,
        averageGlucose: null,
        runIds: ['run1', 'run2'],
        createdAt: mockDate,
        updatedAt: mockDate
      };
      
      const updatedMonth = calculateMonthStatistics(month, runs, true); // Use weighted average
      
      // Weighted average: (120*7 + 140*14) / (7+14) = (840 + 1960) / 21 = 2800 / 21 = 133.33
      // A1C: (133.33 + 46.7) / 28.7 = 6.27
      expect(updatedMonth.averageGlucose).toBeCloseTo(133.33, 2);
      expect(updatedMonth.calculatedA1C).toBeCloseTo(6.27, 2);
    });
  });
});

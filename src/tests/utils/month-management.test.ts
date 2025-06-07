import { describe, it, expect } from 'vitest';
import { createMonth, addRunToMonth, calculateMonthStatistics } from '../../utils/month-management';
import type { Month, Run } from '../../types/glucose';
import { calculateA1C } from '../../utils/a1c-calculator';

describe('Month Management', () => {
  describe('createMonth', () => {
    it('should create a month with the provided parameters', () => {
      const userId = 'user123';
      const name = 'January 2023';
      const startDate = new Date('2023-01-01');
      const endDate = new Date('2023-01-31');
      
      const month = createMonth(userId, name, startDate, endDate);
      
      expect(month).toEqual(expect.objectContaining({
        userId,
        name,
        startDate,
        endDate,
        calculatedA1C: null,
        averageGlucose: null,
        runIds: []
      }));
      
      expect(month.id).toBeDefined();
      expect(month.createdAt).toBeInstanceOf(Date);
      expect(month.updatedAt).toBeInstanceOf(Date);
    });
    
    it('should use current date as default for start and end dates', () => {
      const userId = 'user123';
      const name = 'Current Month';
      
      const month = createMonth(userId, name);
      
      expect(month.startDate).toBeInstanceOf(Date);
      expect(month.endDate).toBeInstanceOf(Date);
    });
    
    it('should throw an error if end date is before start date', () => {
      const userId = 'user123';
      const name = 'Invalid Month';
      const startDate = new Date('2023-01-31');
      const endDate = new Date('2023-01-01');
      
      expect(() => createMonth(userId, name, startDate, endDate)).toThrow(
        'End date cannot be before start date'
      );
    });
  });
  
  describe('addRunToMonth', () => {
    it('should add a run to a month', () => {
      const userId = 'user123';
      const month: Month = {
        id: 'month1',
        userId,
        name: 'January 2023',
        startDate: new Date('2023-01-01'),
        endDate: new Date('2023-01-31'),
        calculatedA1C: null,
        averageGlucose: null,
        runIds: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const run: Run = {
        id: 'run1',
        userId,
        name: 'Week 1',
        startDate: new Date('2023-01-01'),
        endDate: new Date('2023-01-07'),
        calculatedA1C: null,
        averageGlucose: null,
        monthId: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const result = addRunToMonth(run, month);
      
      expect(result.month.runIds).toContain(run.id);
      expect(result.run.monthId).toBe(month.id);
    });
    
    it('should not modify if run is already in the month', () => {
      const userId = 'user123';
      const monthId = 'month1';
      const runId = 'run1';
      
      const month: Month = {
        id: monthId,
        userId,
        name: 'January 2023',
        startDate: new Date('2023-01-01'),
        endDate: new Date('2023-01-31'),
        calculatedA1C: null,
        averageGlucose: null,
        runIds: [runId],
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const run: Run = {
        id: runId,
        userId,
        name: 'Week 1',
        startDate: new Date('2023-01-01'),
        endDate: new Date('2023-01-07'),
        calculatedA1C: null,
        averageGlucose: null,
        monthId,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const result = addRunToMonth(run, month);
      
      expect(result.month.runIds).toEqual([runId]);
      expect(result.run.monthId).toBe(monthId);
    });
    
    it('should throw an error if run dates are outside month range', () => {
      const userId = 'user123';
      const month: Month = {
        id: 'month1',
        userId,
        name: 'January 2023',
        startDate: new Date('2023-01-01'),
        endDate: new Date('2023-01-31'),
        calculatedA1C: null,
        averageGlucose: null,
        runIds: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const run: Run = {
        id: 'run1',
        userId,
        name: 'December Week',
        startDate: new Date('2022-12-25'),
        endDate: new Date('2022-12-31'),
        calculatedA1C: null,
        averageGlucose: null,
        monthId: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      expect(() => addRunToMonth(run, month)).toThrow(
        'Run dates are outside of month date range'
      );
    });
    
    it('should throw an error if run belongs to a different user', () => {
      const month: Month = {
        id: 'month1',
        userId: 'user123',
        name: 'January 2023',
        startDate: new Date('2023-01-01'),
        endDate: new Date('2023-01-31'),
        calculatedA1C: null,
        averageGlucose: null,
        runIds: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const run: Run = {
        id: 'run1',
        userId: 'user456',
        name: 'Week 1',
        startDate: new Date('2023-01-01'),
        endDate: new Date('2023-01-07'),
        calculatedA1C: null,
        averageGlucose: null,
        monthId: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      expect(() => addRunToMonth(run, month)).toThrow(
        'Run belongs to a different user than the month'
      );
    });
  });
  
  describe('calculateMonthStatistics', () => {
    it('should calculate average glucose and A1C for a month with runs', () => {
      const userId = 'user123';
      const month: Month = {
        id: 'month1',
        userId,
        name: 'January 2023',
        startDate: new Date('2023-01-01'),
        endDate: new Date('2023-01-31'),
        calculatedA1C: null,
        averageGlucose: null,
        runIds: ['run1', 'run2'],
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const runs: Run[] = [
        {
          id: 'run1',
          userId,
          name: 'Week 1',
          startDate: new Date('2023-01-01'),
          endDate: new Date('2023-01-07'),
          calculatedA1C: 6.5,
          averageGlucose: 140,
          monthId: 'month1',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'run2',
          userId,
          name: 'Week 2',
          startDate: new Date('2023-01-08'),
          endDate: new Date('2023-01-14'),
          calculatedA1C: 7.0,
          averageGlucose: 160,
          monthId: 'month1',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'run3',
          userId,
          name: 'Week 3',
          startDate: new Date('2023-01-15'),
          endDate: new Date('2023-01-21'),
          calculatedA1C: 6.0,
          averageGlucose: 120,
          monthId: 'month2', // Different month
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];
      
      const result = calculateMonthStatistics(month, runs);
      
      expect(result.averageGlucose).toBe(150); // Average of 140 and 160
      expect(result.calculatedA1C).toBe(calculateA1C(150));
    });
    
    it('should handle empty runs array', () => {
      const userId = 'user123';
      const month: Month = {
        id: 'month1',
        userId,
        name: 'January 2023',
        startDate: new Date('2023-01-01'),
        endDate: new Date('2023-01-31'),
        calculatedA1C: null,
        averageGlucose: null,
        runIds: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const result = calculateMonthStatistics(month, []);
      
      expect(result.averageGlucose).toBe(0);
      expect(result.calculatedA1C).toBe(calculateA1C(0));
    });
    
    it('should calculate weighted average when specified', () => {
      const userId = 'user123';
      const month: Month = {
        id: 'month1',
        userId,
        name: 'January 2023',
        startDate: new Date('2023-01-01'),
        endDate: new Date('2023-01-31'),
        calculatedA1C: null,
        averageGlucose: null,
        runIds: ['run1', 'run2'],
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const runs: Run[] = [
        {
          id: 'run1',
          userId,
          name: 'Week 1',
          startDate: new Date('2023-01-01'),
          endDate: new Date('2023-01-03'), // 3 days
          calculatedA1C: 6.5,
          averageGlucose: 140,
          monthId: 'month1',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'run2',
          userId,
          name: 'Week 2',
          startDate: new Date('2023-01-04'),
          endDate: new Date('2023-01-10'), // 7 days
          calculatedA1C: 7.0,
          averageGlucose: 160,
          monthId: 'month1',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];
      
      const result = calculateMonthStatistics(month, runs, true);
      
      // Weighted average: (140 * 3 + 160 * 7) / (3 + 7) = 154
      expect(result.averageGlucose).toBeCloseTo(154);
      expect(result.calculatedA1C).toBeCloseTo(calculateA1C(154));
    });
  });
});
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createRun, addReadingToRun, calculateRunStatistics } from '../../utils/run-management';
import type { GlucoseReading, Run } from '../../types/glucose';

// Mock the A1C calculator functions
vi.mock('../../utils/a1c-calculator', () => ({
  calculateA1C: vi.fn((avg) => (avg + 46.7) / 28.7),
  calculateAverageGlucose: vi.fn((readings) => {
    if (readings.length === 0) return 0;
    return readings.reduce((sum, r) => sum + r.value, 0) / readings.length;
  })
}));

describe('Run Management', () => {
  let mockDate: Date;
  
  beforeEach(() => {
    mockDate = new Date('2025-01-01T12:00:00Z');
    vi.useFakeTimers();
    vi.setSystemTime(mockDate);
  });
  
  afterEach(() => {
    vi.useRealTimers();
  });
  
  describe('createRun', () => {
    it('should create a new run with default values', () => {
      const userId = 'user123';
      const name = 'January Run';
      
      const run = createRun(userId, name);
      
      expect(run).toEqual({
        id: expect.any(String),
        userId,
        name,
        startDate: mockDate,
        endDate: mockDate,
        calculatedA1C: null,
        averageGlucose: null,
        monthId: null,
        createdAt: mockDate,
        updatedAt: mockDate
      });
    });
    
    it('should create a run with custom dates', () => {
      const userId = 'user123';
      const name = 'Custom Run';
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-07');
      
      const run = createRun(userId, name, startDate, endDate);
      
      expect(run).toEqual({
        id: expect.any(String),
        userId,
        name,
        startDate,
        endDate,
        calculatedA1C: null,
        averageGlucose: null,
        monthId: null,
        createdAt: mockDate,
        updatedAt: mockDate
      });
    });
    
    it('should throw an error if end date is before start date', () => {
      const userId = 'user123';
      const name = 'Invalid Run';
      const startDate = new Date('2025-01-07');
      const endDate = new Date('2025-01-01');
      
      expect(() => createRun(userId, name, startDate, endDate)).toThrow();
    });
  });
  
  describe('addReadingToRun', () => {
    it('should add a reading to a run', () => {
      const run: Run = {
        id: 'run1',
        userId: 'user123',
        name: 'Test Run',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-07'),
        calculatedA1C: null,
        averageGlucose: null,
        monthId: null,
        createdAt: mockDate,
        updatedAt: mockDate
      };
      
      const reading: GlucoseReading = {
        id: 'reading1',
        userId: 'user123',
        value: 120,
        timestamp: new Date('2025-01-03'),
        mealContext: 'FASTING',
        createdAt: mockDate,
        updatedAt: mockDate
      };
      
      const updatedReading = addReadingToRun(reading, run);
      
      expect(updatedReading).toEqual({
        ...reading,
        runId: run.id
      });
    });
    
    it('should throw an error if reading is outside run date range', () => {
      const run: Run = {
        id: 'run1',
        userId: 'user123',
        name: 'Test Run',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-07'),
        calculatedA1C: null,
        averageGlucose: null,
        monthId: null,
        createdAt: mockDate,
        updatedAt: mockDate
      };
      
      const reading: GlucoseReading = {
        id: 'reading1',
        userId: 'user123',
        value: 120,
        timestamp: new Date('2025-01-10'), // Outside range
        mealContext: 'FASTING',
        createdAt: mockDate,
        updatedAt: mockDate
      };
      
      expect(() => addReadingToRun(reading, run)).toThrow();
    });
    
    it('should throw an error if reading is from a different user', () => {
      const run: Run = {
        id: 'run1',
        userId: 'user123',
        name: 'Test Run',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-07'),
        calculatedA1C: null,
        averageGlucose: null,
        monthId: null,
        createdAt: mockDate,
        updatedAt: mockDate
      };
      
      const reading: GlucoseReading = {
        id: 'reading1',
        userId: 'differentUser', // Different user
        value: 120,
        timestamp: new Date('2025-01-03'),
        mealContext: 'FASTING',
        createdAt: mockDate,
        updatedAt: mockDate
      };
      
      expect(() => addReadingToRun(reading, run)).toThrow();
    });
  });
  
  describe('calculateRunStatistics', () => {
    it('should calculate A1C and average glucose for a run', () => {
      const readings: GlucoseReading[] = [
        {
          id: 'reading1',
          userId: 'user123',
          value: 100,
          timestamp: new Date('2025-01-02'),
          mealContext: 'FASTING',
          runId: 'run1',
          createdAt: mockDate,
          updatedAt: mockDate
        },
        {
          id: 'reading2',
          userId: 'user123',
          value: 140,
          timestamp: new Date('2025-01-03'),
          mealContext: 'AFTER_BREAKFAST',
          runId: 'run1',
          createdAt: mockDate,
          updatedAt: mockDate
        }
      ];
      
      const run: Run = {
        id: 'run1',
        userId: 'user123',
        name: 'Test Run',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-07'),
        calculatedA1C: null,
        averageGlucose: null,
        monthId: null,
        createdAt: mockDate,
        updatedAt: mockDate
      };
      
      const updatedRun = calculateRunStatistics(run, readings);
      
      // Average glucose: (100 + 140) / 2 = 120
      // A1C: (120 + 46.7) / 28.7 = 5.8
      expect(updatedRun.averageGlucose).toBe(120);
      expect(updatedRun.calculatedA1C).toBeCloseTo(5.8, 1);
    });
    
    it('should handle empty readings array', () => {
      const readings: GlucoseReading[] = [];
      
      const run: Run = {
        id: 'run1',
        userId: 'user123',
        name: 'Test Run',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-07'),
        calculatedA1C: null,
        averageGlucose: null,
        monthId: null,
        createdAt: mockDate,
        updatedAt: mockDate
      };
      
      const updatedRun = calculateRunStatistics(run, readings);
      
      expect(updatedRun.averageGlucose).toBe(0);
      expect(updatedRun.calculatedA1C).toBeCloseTo(1.63, 2); // (0 + 46.7) / 28.7
    });
    
    it('should filter out readings that do not belong to the run', () => {
      const readings: GlucoseReading[] = [
        {
          id: 'reading1',
          userId: 'user123',
          value: 100,
          timestamp: new Date('2025-01-02'),
          mealContext: 'FASTING',
          runId: 'run1', // Matches
          createdAt: mockDate,
          updatedAt: mockDate
        },
        {
          id: 'reading2',
          userId: 'user123',
          value: 200, // This should be excluded
          timestamp: new Date('2025-01-03'),
          mealContext: 'AFTER_BREAKFAST',
          runId: 'run2', // Different run
          createdAt: mockDate,
          updatedAt: mockDate
        }
      ];
      
      const run: Run = {
        id: 'run1',
        userId: 'user123',
        name: 'Test Run',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-07'),
        calculatedA1C: null,
        averageGlucose: null,
        monthId: null,
        createdAt: mockDate,
        updatedAt: mockDate
      };
      
      const updatedRun = calculateRunStatistics(run, readings);
      
      // Should only use the first reading with value 100
      expect(updatedRun.averageGlucose).toBe(100);
      expect(updatedRun.calculatedA1C).toBeCloseTo(5.1, 1); // (100 + 46.7) / 28.7
    });
  });
});

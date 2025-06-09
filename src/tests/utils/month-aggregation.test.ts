import { describe, it, expect } from 'vitest';
import { aggregateMonthData, generateMonthSummary } from '../../utils/month-aggregation';
import type { Month, Run, GlucoseReading } from '../../types/glucose';

describe('Month Aggregation Utils', () => {
  // Sample test data
  const testMonth: Month = {
    id: 'month-1',
    userId: 'user-1',
    name: 'January 2023',
    startDate: new Date('2023-01-01'),
    endDate: new Date('2023-01-31'),
    calculatedA1C: 7.0,
    averageGlucose: 154,
    runIds: ['run-1', 'run-2'],
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const testRuns: Run[] = [
    {
      id: 'run-1',
      userId: 'user-1',
      name: 'Week 1',
      startDate: new Date('2023-01-01'),
      endDate: new Date('2023-01-07'),
      calculatedA1C: 7.2,
      averageGlucose: 160,
      monthId: 'month-1',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'run-2',
      userId: 'user-1',
      name: 'Week 2',
      startDate: new Date('2023-01-08'),
      endDate: new Date('2023-01-14'),
      calculatedA1C: 6.8,
      averageGlucose: 148,
      monthId: 'month-1',
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  const testReadings: GlucoseReading[] = [
    {
      id: 'reading-1',
      userId: 'user-1',
      value: 120,
      timestamp: new Date('2023-01-01T08:00:00'),
      mealContext: 'BEFORE_BREAKFAST',
      runId: 'run-1',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'reading-2',
      userId: 'user-1',
      value: 190,
      timestamp: new Date('2023-01-01T12:00:00'),
      mealContext: 'AFTER_LUNCH',
      runId: 'run-1',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'reading-3',
      userId: 'user-1',
      value: 65,
      timestamp: new Date('2023-01-02T08:00:00'),
      mealContext: 'BEFORE_BREAKFAST',
      runId: 'run-1',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'reading-4',
      userId: 'user-1',
      value: 145,
      timestamp: new Date('2023-01-08T08:00:00'),
      mealContext: 'BEFORE_BREAKFAST',
      runId: 'run-2',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'reading-5',
      userId: 'user-1',
      value: 160,
      timestamp: new Date('2023-01-08T18:00:00'),
      mealContext: 'AFTER_DINNER',
      runId: 'run-2',
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  describe('aggregateMonthData', () => {
    it('should correctly aggregate month data', () => {
      const result = aggregateMonthData(testMonth, testRuns, testReadings);
      
      expect(result.totalReadings).toBe(5);
      expect(result.highReadings).toBe(1); // > 180 mg/dL
      expect(result.lowReadings).toBe(1);  // < 70 mg/dL
      expect(result.inRangeReadings).toBe(3); // 70-180 mg/dL
      expect(result.highestReading).toBe(190);
      expect(result.lowestReading).toBe(65);
    });

    it('should calculate readings per day', () => {
      const result = aggregateMonthData(testMonth, testRuns, testReadings);
      
      // 5 readings over 31 days
      expect(result.readingsPerDay).toBeCloseTo(5 / 31);
    });

    it('should identify most common time', () => {
      const result = aggregateMonthData(testMonth, testRuns, testReadings);
      
      // We have 3 readings at 8:00
      expect(result.mostCommonTime).toBe('8:00');
      expect(result.timeDistribution['8:00']).toBe(3);
    });

    it('should handle empty readings array', () => {
      const result = aggregateMonthData(testMonth, testRuns, []);
      
      expect(result.totalReadings).toBe(0);
      expect(result.highestReading).toBe(0);
      expect(result.lowestReading).toBe(0);
      expect(result.readingsPerDay).toBe(0);
    });

    it('should filter readings to only include those for the month', () => {
      // Add a reading for a different run not in this month
      const readingsWithExtra = [
        ...testReadings,
        {
          id: 'reading-6',
          userId: 'user-1',
          value: 200,
          timestamp: new Date('2023-02-01T08:00:00'),
          mealContext: 'BEFORE_BREAKFAST' as const,
          runId: 'run-3', // Not in this month
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];
      
      const result = aggregateMonthData(testMonth, testRuns, readingsWithExtra);
      
      // Should still be 5, not 6
      expect(result.totalReadings).toBe(5);
    });
  });

  describe('generateMonthSummary', () => {
    it('should generate correct summary with improving trend', () => {
      // First run has higher A1C than second run
      const result = generateMonthSummary(testMonth, testRuns, testReadings);
      
      expect(result.a1cTrend).toBe('improving');
      expect(result.timeInRange).toBe(60); // 3 out of 5 readings in range
      expect(result.averageReadingsPerDay).toBeCloseTo(5 / 31);
      expect(result.totalRuns).toBe(2);
      expect(result.insights).toBeInstanceOf(Array);
    });

    it('should generate correct summary with worsening trend', () => {
      // Reverse the runs to make A1C trend worsen
      const worseningRuns = [
        {
          ...testRuns[1],
          id: 'run-3',
          calculatedA1C: 6.8,
          startDate: new Date('2023-01-01'),
          endDate: new Date('2023-01-07')
        },
        {
          ...testRuns[0],
          id: 'run-4',
          calculatedA1C: 7.5, // Higher than the first run
          startDate: new Date('2023-01-08'),
          endDate: new Date('2023-01-14')
        }
      ];
      
      const result = generateMonthSummary(testMonth, worseningRuns, testReadings);
      
      expect(result.a1cTrend).toBe('worsening');
    });

    it('should generate correct summary with stable trend', () => {
      // Make the runs have similar A1C values
      const stableRuns = [
        {
          ...testRuns[0],
          calculatedA1C: 7.0
        },
        {
          ...testRuns[1],
          calculatedA1C: 7.1 // Very close to the first run
        }
      ];
      
      const result = generateMonthSummary(testMonth, stableRuns, testReadings);
      
      expect(result.a1cTrend).toBe('stable');
    });

    it('should handle months with no runs', () => {
      const result = generateMonthSummary(testMonth, [], testReadings);
      
      expect(result.a1cTrend).toBe('unknown');
      expect(result.totalRuns).toBe(0);
    });

    it('should generate appropriate insights based on data', () => {
      // Create readings with high percentage above target
      const highReadings: GlucoseReading[] = Array(10).fill(null).map((_, i) => ({
        id: `high-${i}`,
        userId: 'user-1',
        value: 200, // Above target
        timestamp: new Date(`2023-01-0${i+1}T08:00:00`),
        mealContext: 'BEFORE_BREAKFAST',
        runId: 'run-1',
        createdAt: new Date(),
        updatedAt: new Date()
      }));
      
      const result = generateMonthSummary(testMonth, testRuns, highReadings);
      
      // Should include insight about high readings
      expect(result.insights.some(insight => 
        insight.includes('High percentage of readings above target range')
      )).toBe(true);
    });
  });
});
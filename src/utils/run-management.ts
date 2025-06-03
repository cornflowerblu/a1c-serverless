import { v4 as uuidv4 } from 'uuid';
import type { GlucoseReading, Run } from '../types/glucose';
import { calculateA1C, calculateAverageGlucose } from './a1c-calculator';

/**
 * Creates a new run with the given parameters
 * 
 * @param userId - The user ID who owns this run
 * @param name - The name of the run
 * @param startDate - Optional start date (defaults to current date)
 * @param endDate - Optional end date (defaults to current date)
 * @returns A new Run object
 */
export function createRun(
  userId: string,
  name: string,
  startDate: Date = new Date(),
  endDate: Date = new Date()
): Run {
  if (endDate < startDate) {
    throw new Error('End date cannot be before start date');
  }
  
  const now = new Date();
  
  return {
    id: uuidv4(),
    userId,
    name,
    startDate,
    endDate,
    calculatedA1C: null,
    averageGlucose: null,
    monthId: null,
    createdAt: now,
    updatedAt: now
  };
}

/**
 * Adds a reading to a run by setting the runId on the reading
 * 
 * @param reading - The glucose reading to add
 * @param run - The run to add the reading to
 * @returns The updated reading with runId set
 */
export function addReadingToRun(
  reading: GlucoseReading,
  run: Run
): GlucoseReading {
  // Validate that reading is within run date range
  if (reading.timestamp < run.startDate || reading.timestamp > run.endDate) {
    throw new Error('Reading timestamp is outside of run date range');
  }
  
  // Validate that reading belongs to the same user
  if (reading.userId !== run.userId) {
    throw new Error('Reading belongs to a different user than the run');
  }
  
  // Return a new reading with the runId set
  return {
    ...reading,
    runId: run.id
  };
}

/**
 * Calculates A1C and average glucose for a run based on its readings
 * 
 * @param run - The run to calculate statistics for
 * @param readings - All readings (will be filtered to only include those for this run)
 * @returns The updated run with calculated statistics
 */
export function calculateRunStatistics(
  run: Run,
  readings: GlucoseReading[]
): Run {
  // Filter readings to only include those for this run
  const runReadings = readings.filter(reading => reading.runId === run.id);
  
  // Calculate average glucose
  const averageGlucose = calculateAverageGlucose(runReadings);
  
  // Calculate A1C
  const calculatedA1C = calculateA1C(averageGlucose);
  
  // Return updated run
  return {
    ...run,
    averageGlucose,
    calculatedA1C,
    updatedAt: new Date()
  };
}

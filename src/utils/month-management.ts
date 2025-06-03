import { v4 as uuidv4 } from 'uuid';
import type { Run, Month } from '../types/glucose';
import { calculateA1C } from './a1c-calculator';

/**
 * Creates a new month with the given parameters
 * 
 * @param userId - The user ID who owns this month
 * @param name - The name of the month
 * @param startDate - Optional start date (defaults to current date)
 * @param endDate - Optional end date (defaults to current date)
 * @returns A new Month object
 */
export function createMonth(
  userId: string,
  name: string,
  startDate: Date = new Date(),
  endDate: Date = new Date()
): Month {
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
    runIds: [],
    createdAt: now,
    updatedAt: now
  };
}

/**
 * Adds a run to a month
 * 
 * @param run - The run to add to the month
 * @param month - The month to add the run to
 * @returns Object containing the updated run and month
 */
export function addRunToMonth(
  run: Run,
  month: Month
): { run: Run; month: Month } {
  // Validate that run is within month date range
  if (run.startDate < month.startDate || run.endDate > month.endDate) {
    throw new Error('Run dates are outside of month date range');
  }
  
  // Validate that run belongs to the same user
  if (run.userId !== month.userId) {
    throw new Error('Run belongs to a different user than the month');
  }
  
  // Check if run is already in the month
  if (month.runIds.includes(run.id) && run.monthId === month.id) {
    return { run, month };
  }
  
  // Add run to month
  const updatedMonth: Month = {
    ...month,
    runIds: [...month.runIds, run.id],
    updatedAt: new Date()
  };
  
  // Update run with month ID
  const updatedRun: Run = {
    ...run,
    monthId: month.id,
    updatedAt: new Date()
  };
  
  return { run: updatedRun, month: updatedMonth };
}

/**
 * Calculates A1C and average glucose for a month based on its runs
 * 
 * @param month - The month to calculate statistics for
 * @param runs - All runs (will be filtered to only include those for this month)
 * @param useWeightedAverage - Whether to use weighted average based on run duration
 * @returns The updated month with calculated statistics
 */
export function calculateMonthStatistics(
  month: Month,
  runs: Run[],
  useWeightedAverage: boolean = false
): Month {
  // Filter runs to only include those for this month
  const monthRuns = runs.filter(run => run.monthId === month.id);
  
  if (monthRuns.length === 0) {
    // No runs for this month
    return {
      ...month,
      averageGlucose: 0,
      calculatedA1C: calculateA1C(0),
      updatedAt: new Date()
    };
  }
  
  let averageGlucose: number;
  
  if (useWeightedAverage) {
    // Calculate weighted average based on run duration
    let totalWeight = 0;
    let weightedSum = 0;
    
    for (const run of monthRuns) {
      // Calculate weight as number of days in the run
      const days = Math.ceil((run.endDate.getTime() - run.startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      totalWeight += days;
      weightedSum += (run.averageGlucose || 0) * days;
    }
    
    averageGlucose = weightedSum / totalWeight;
  } else {
    // Simple average of all runs
    const sum = monthRuns.reduce((total, run) => total + (run.averageGlucose || 0), 0);
    averageGlucose = sum / monthRuns.length;
  }
  
  // Calculate A1C
  const calculatedA1C = calculateA1C(averageGlucose);
  
  // Return updated month
  return {
    ...month,
    averageGlucose,
    calculatedA1C,
    updatedAt: new Date()
  };
}

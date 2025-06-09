import type { Month, Run, GlucoseReading } from '../types/glucose';
import { calculateA1C } from './a1c-calculator';

/**
 * Aggregates data for a month, including runs and readings statistics
 * 
 * @param month - The month to aggregate data for
 * @param runs - Array of runs associated with the month
 * @param readings - Array of all glucose readings
 * @returns Object containing aggregated statistics
 */
export function aggregateMonthData(
  month: Month,
  runs: Run[],
  readings: GlucoseReading[]
): {
  totalReadings: number;
  readingsPerDay: number;
  highReadings: number;
  lowReadings: number;
  inRangeReadings: number;
  highestReading: number;
  lowestReading: number;
  mostCommonTime: string;
  timeDistribution: Record<string, number>;
} {
  // Filter runs to only include those for this month
  const monthRuns = runs.filter(run => run.monthId === month.id);
  
  // Get all reading IDs from runs
  const runIds = monthRuns.map(run => run.id);
  
  // Filter readings to only include those for this month's runs
  const monthReadings = readings.filter(reading => reading.runId && runIds.includes(reading.runId));
  
  // Calculate total readings
  const totalReadings = monthReadings.length;
  
  // Calculate readings per day
  const daysDiff = Math.ceil((month.endDate.getTime() - month.startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const readingsPerDay = totalReadings / daysDiff;
  
  // Calculate high, low, and in-range readings (standard ranges: 70-180 mg/dL)
  const highReadings = monthReadings.filter(reading => reading.value > 180).length;
  const lowReadings = monthReadings.filter(reading => reading.value < 70).length;
  const inRangeReadings = totalReadings - highReadings - lowReadings;
  
  // Find highest and lowest readings
  const highestReading = monthReadings.length > 0 
    ? Math.max(...monthReadings.map(reading => reading.value))
    : 0;
  const lowestReading = monthReadings.length > 0
    ? Math.min(...monthReadings.map(reading => reading.value))
    : 0;
  
  // Calculate time distribution (which hours of the day have the most readings)
  const timeDistribution: Record<string, number> = {};
  let maxCount = 0;
  let mostCommonTime = '';
  
  monthReadings.forEach(reading => {
    const hour = new Date(reading.timestamp).getHours();
    const timeKey = `${hour}:00`;
    
    if (!timeDistribution[timeKey]) {
      timeDistribution[timeKey] = 0;
    }
    
    timeDistribution[timeKey]++;
    
    if (timeDistribution[timeKey] > maxCount) {
      maxCount = timeDistribution[timeKey];
      mostCommonTime = timeKey;
    }
  });
  
  return {
    totalReadings,
    readingsPerDay,
    highReadings,
    lowReadings,
    inRangeReadings,
    highestReading,
    lowestReading,
    mostCommonTime,
    timeDistribution
  };
}

/**
 * Generates a month summary with key statistics and insights
 * 
 * @param month - The month to generate summary for
 * @param runs - Array of runs associated with the month
 * @param readings - Array of all glucose readings
 * @returns Object containing summary information
 */
export function generateMonthSummary(
  month: Month,
  runs: Run[],
  readings: GlucoseReading[]
): {
  a1cTrend: 'improving' | 'worsening' | 'stable' | 'unknown';
  timeInRange: number;
  averageReadingsPerDay: number;
  totalRuns: number;
  insights: string[];
} {
  // Get aggregated data
  const aggregatedData = aggregateMonthData(month, runs, readings);
  
  // Calculate time in range percentage
  const timeInRange = aggregatedData.totalReadings > 0
    ? (aggregatedData.inRangeReadings / aggregatedData.totalReadings) * 100
    : 0;
  
  // Determine A1C trend (would need historical data for better accuracy)
  let a1cTrend: 'improving' | 'worsening' | 'stable' | 'unknown' = 'unknown';
  
  // Filter runs to only include those for this month
  const monthRuns = runs.filter(run => run.monthId === month.id);
  
  // Sort runs by start date
  const sortedRuns = [...monthRuns].sort((a, b) => 
    a.startDate.getTime() - b.startDate.getTime()
  );
  
  if (sortedRuns.length >= 2) {
    const firstRunA1C = sortedRuns[0].calculatedA1C || 0;
    const lastRunA1C = sortedRuns[sortedRuns.length - 1].calculatedA1C || 0;
    
    if (lastRunA1C < firstRunA1C - 0.2) {
      a1cTrend = 'improving';
    } else if (lastRunA1C > firstRunA1C + 0.2) {
      a1cTrend = 'worsening';
    } else {
      a1cTrend = 'stable';
    }
  }
  
  // Generate insights
  const insights: string[] = [];
  
  if (aggregatedData.highReadings > aggregatedData.totalReadings * 0.3) {
    insights.push('High percentage of readings above target range.');
  }
  
  if (aggregatedData.lowReadings > aggregatedData.totalReadings * 0.1) {
    insights.push('Consider adjusting treatment to reduce low glucose events.');
  }
  
  if (timeInRange > 70) {
    insights.push('Good time in range percentage. Keep up the good work!');
  } else if (timeInRange < 50) {
    insights.push('Time in range is below recommended levels.');
  }
  
  if (aggregatedData.readingsPerDay < 3) {
    insights.push('Consider taking more readings throughout the day for better monitoring.');
  }
  
  return {
    a1cTrend,
    timeInRange,
    averageReadingsPerDay: aggregatedData.readingsPerDay,
    totalRuns: monthRuns.length,
    insights
  };
}
import type { GlucoseReading, MealContextWeights } from '../types/glucose';

/**
 * Calculates estimated A1C percentage from average glucose value (mg/dL)
 * Formula: A1C = (Average Glucose + 46.7) / 28.7
 * 
 * @param averageGlucose - Average glucose value in mg/dL
 * @returns Estimated A1C percentage
 */
export function calculateA1C(averageGlucose: number): number {
  if (isNaN(averageGlucose)) {
    throw new Error('Average glucose value must be a number');
  }
  
  if (averageGlucose < 0) {
    throw new Error('Average glucose value cannot be negative');
  }
  
  return (averageGlucose + 46.7) / 28.7;
}

/**
 * Calculates average glucose from an array of glucose readings
 * Optionally applies weights to different meal contexts
 * 
 * @param readings - Array of glucose readings
 * @param weights - Optional weights for different meal contexts
 * @returns Average glucose value in mg/dL
 */
export function calculateAverageGlucose(
  readings: GlucoseReading[],
  weights?: MealContextWeights
): number {
  if (readings.length === 0) {
    return 0;
  }

  if (!weights) {
    // Simple average if no weights provided
    const sum = readings.reduce((total, reading) => total + reading.value, 0);
    return sum / readings.length;
  } else {
    // Weighted average based on meal context
    let weightedSum = 0;
    let totalWeight = 0;

    for (const reading of readings) {
      const weight = weights[reading.mealContext] || 1; // Default weight is 1
      weightedSum += reading.value * weight;
      totalWeight += weight;
    }

    return weightedSum / totalWeight;
  }
}

export type MealContext =
  | 'BEFORE_BREAKFAST'
  | 'AFTER_BREAKFAST'
  | 'BEFORE_LUNCH'
  | 'AFTER_LUNCH'
  | 'BEFORE_DINNER'
  | 'AFTER_DINNER'
  | 'BEDTIME'
  | 'WAKEUP'
  | 'FASTING'
  | 'OTHER';

export interface GlucoseReading {
  id: string;
  userId: string;
  value: number; // in mg/dl
  timestamp: Date;
  mealContext: MealContext;
  notes?: string;
  runId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Run {
  id: string;
  userId: string;
  name: string;
  startDate: Date;
  endDate: Date;
  calculatedA1C: number | null;
  averageGlucose: number | null;
  monthId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Month {
  id: string;
  userId: string;
  name: string;
  startDate: Date;
  endDate: Date;
  calculatedA1C: number | null;
  averageGlucose: number | null;
  runIds: string[];
  createdAt: Date;
  updatedAt: Date;
}

export type MealContextWeights = {
  [key in MealContext]?: number;
};

'use client';

import { useEffect, useState } from 'react';
import { Dashboard } from '../components/Dashboard';

interface GlucoseReading {
  id: string;
  value: number;
  timestamp: string;
  mealContext: string;
}

export default function DashboardPage() {
  const [recentReadings, setRecentReadings] = useState<GlucoseReading[]>([]);
  const [totalReadings, setTotalReadings] = useState(0);
  const [averageGlucose, setAverageGlucose] = useState<number | null>(null);
  const [estimatedA1C, setEstimatedA1C] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // Fetch readings
        const readingsResponse = await fetch('/api/readings');
        
        if (!readingsResponse.ok) {
          throw new Error('Failed to fetch readings');
        }
        
        const readingsData = await readingsResponse.json();
        const allReadings = readingsData.readings || [];
        
        // Set total readings count
        setTotalReadings(allReadings.length);
        
        // Get only the 5 most recent readings
        setRecentReadings(allReadings.slice(0, 5));
        
        // Calculate average glucose if we have readings
        if (allReadings.length > 0) {
          const sum = allReadings.reduce((acc: number, reading: GlucoseReading) => acc + reading.value, 0);
          setAverageGlucose(sum / allReadings.length);
          
          // Estimate A1C if we have enough readings (at least 14 days of data)
          if (allReadings.length >= 7) {
            // Simple A1C estimation formula: (average glucose + 46.7) / 28.7
            const estimatedA1C = (sum / allReadings.length + 46.7) / 28.7;
            setEstimatedA1C(estimatedA1C);
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };
    
    fetchDashboardData();
  }, []);
  
  return (
    <Dashboard 
      recentReadings={recentReadings}
      totalReadings={totalReadings}
      averageGlucose={averageGlucose}
      estimatedA1C={estimatedA1C}
      loading={loading}
      error={error}
    />
  );
}
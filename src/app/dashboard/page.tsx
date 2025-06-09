'use client';

import { useEffect, useState } from 'react';
import { Dashboard } from '../components/Dashboard';
import DashboardSummary from '../components/DashboardSummary';
import A1CEstimator from '../components/A1CEstimator';

interface GlucoseReading {
  id: string;
  value: number;
  timestamp: string;
  mealContext: string;
}

export default function DashboardPage() {
  const [recentReadings, setRecentReadings] = useState<GlucoseReading[]>([]);
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
        
        // Get only the 5 most recent readings
        setRecentReadings(allReadings.slice(0, 5));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };
    
    fetchDashboardData();
  }, []);
  
  return (
    <div className="space-y-6">
      {/* Summary cards using edge function */}
      <DashboardSummary />
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* A1C Estimator using edge function */}
        <div className="md:col-span-1">
          <A1CEstimator />
        </div>
        
        {/* Recent readings */}
        <div className="md:col-span-2">
          <Dashboard 
            recentReadings={recentReadings}
            loading={loading}
            error={error}
          />
        </div>
      </div>
    </div>
  );
}
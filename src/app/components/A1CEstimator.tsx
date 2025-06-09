'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';

interface EstimateResult {
  a1cEstimate: number;
  averageGlucose: number;
  readingsCount: number;
  period?: {
    startDate: string;
    endDate: string;
  };
}

export default function A1CEstimator() {
  const [result, setResult] = useState<EstimateResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState<'30days' | '90days' | 'all'>('30days');

  const fetchEstimate = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Build query parameters based on selected timeframe
      let queryParams = '';
      if (timeframe === '30days') {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        queryParams = `?startDate=${thirtyDaysAgo.toISOString()}`;
      } else if (timeframe === '90days') {
        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
        queryParams = `?startDate=${ninetyDaysAgo.toISOString()}`;
      }
      
      const response = await fetch(`/api/estimate${queryParams}`);
      
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
      
      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to calculate estimate');
      console.error('Error fetching A1C estimate:', err);
    } finally {
      setLoading(false);
    }
  };

  const getA1CColor = (a1c: number | null | undefined) => {
    if (!a1c) return 'bg-gray-100 text-gray-500';
    if (a1c < 5.7) return 'bg-green-100 text-green-800';
    if (a1c < 6.5) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const getA1CCategory = (a1c: number | null | undefined) => {
    if (!a1c) return 'Unknown';
    if (a1c < 5.7) return 'Normal';
    if (a1c < 6.5) return 'Prediabetes';
    return 'Diabetes';
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>A1C Estimator</span>
          {result?.a1cEstimate && (
            <Badge className={getA1CColor(result.a1cEstimate)}>
              {result.a1cEstimate.toFixed(1)}% - {getA1CCategory(result.a1cEstimate)}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="bg-red-50 p-3 rounded-md mb-4 text-red-800">
            {error}
          </div>
        )}
        
        {result ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 p-3 rounded-md">
                <div className="text-sm text-gray-500">A1C Estimate</div>
                <div className="text-2xl font-bold">
                  {result.a1cEstimate ? `${result.a1cEstimate.toFixed(1)}%` : 'N/A'}
                </div>
              </div>
              <div className="bg-gray-50 p-3 rounded-md">
                <div className="text-sm text-gray-500">Average Glucose</div>
                <div className="text-2xl font-bold">
                  {result.averageGlucose ? `${result.averageGlucose.toFixed(0)} mg/dL` : 'N/A'}
                </div>
              </div>
            </div>
            
            <div className="text-sm text-gray-500">
              Based on {result.readingsCount} readings
              {result.period && ` from ${new Date(result.period.startDate).toLocaleDateString()} to ${new Date(result.period.endDate).toLocaleDateString()}`}
            </div>
          </div>
        ) : (
          <div className="text-center py-4 text-gray-500">
            Select a timeframe and click "Calculate" to estimate your A1C
          </div>
        )}
        
        <div className="mt-6">
          <div className="flex space-x-2 mb-4">
            <Button 
              variant={timeframe === '30days' ? 'default' : 'outline'} 
              onClick={() => setTimeframe('30days')}
              size="sm"
            >
              Last 30 Days
            </Button>
            <Button 
              variant={timeframe === '90days' ? 'default' : 'outline'} 
              onClick={() => setTimeframe('90days')}
              size="sm"
            >
              Last 90 Days
            </Button>
            <Button 
              variant={timeframe === 'all' ? 'default' : 'outline'} 
              onClick={() => setTimeframe('all')}
              size="sm"
            >
              All Time
            </Button>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button 
          onClick={fetchEstimate} 
          disabled={loading}
          className="w-full"
        >
          {loading ? 'Calculating...' : 'Calculate A1C Estimate'}
        </Button>
      </CardFooter>
    </Card>
  );
}
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../../../components/ui/card';
import { Label } from '../../../components/ui/label';
import { Switch } from '../../../components/ui/switch';
import { Badge } from '../../../components/ui/badge';

interface MonthData {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  calculatedA1C: number | null;
  averageGlucose: number | null;
}

export default function CalculateMonthPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [month, setMonth] = useState<MonthData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useWeightedAverage, setUseWeightedAverage] = useState(true);
  const [runCount, setRunCount] = useState(0);
  const [readingCount, setReadingCount] = useState(0);
  
  useEffect(() => {
    async function fetchMonth() {
      try {
        // Fetch month data
        const monthResponse = await fetch(`/api/months/${params.id}`);
        
        if (!monthResponse.ok) {
          throw new Error('Failed to fetch month data');
        }
        
        const monthData = await monthResponse.json();
        setMonth(monthData.month);
        
        // Fetch run count
        const runsResponse = await fetch(`/api/runs?monthId=${params.id}`);
        
        if (runsResponse.ok) {
          const runsData = await runsResponse.json();
          setRunCount(runsData.runs?.length || 0);
          
          // Estimate reading count (this would be better with a dedicated API endpoint)
          setReadingCount(runsData.runs?.reduce((total, run) => total + (run.readingCount || 5), 0) || 0);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchMonth();
  }, [params.id]);
  
  const handleCalculate = async () => {
    setIsCalculating(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/months/${params.id}/calculate`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ useWeightedAverage })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to calculate A1C');
      }
      
      const data = await response.json();
      setMonth(data.month);
      
      // Show success message or redirect
      setTimeout(() => {
        router.push(`/months/${params.id}`);
        router.refresh();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsCalculating(false);
    }
  };
  
  if (isLoading) {
    return (
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-6">Calculate A1C</h1>
        <Card className="animate-pulse">
          <CardHeader>
            <div className="h-6 bg-gray-200 rounded w-1/3 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </CardHeader>
          <CardContent>
            <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  if (error || !month) {
    return (
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-6">Calculate A1C</h1>
        <p className="text-red-500">{error || 'Month not found'}</p>
        <Link href="/months">
          <Button className="mt-4">Back to Months</Button>
        </Link>
      </div>
    );
  }
  
  // Determine if we have enough data for calculation
  const hasEnoughData = runCount > 0;
  
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Calculate A1C for {month.name}</h1>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Month Information</CardTitle>
          <CardDescription>
            {new Date(month.startDate).toLocaleDateString()} - {new Date(month.endDate).toLocaleDateString()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between">
              <span className="font-medium">Current A1C Estimate:</span>
              <span className={month.calculatedA1C ? (month.calculatedA1C > 7 ? 'text-red-600' : 'text-green-600') : ''}>
                {month.calculatedA1C ? `${month.calculatedA1C.toFixed(1)}%` : 'Not calculated'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Current Average Glucose:</span>
              <span className={month.averageGlucose ? (month.averageGlucose > 180 ? 'text-red-600' : 'text-green-600') : ''}>
                {month.averageGlucose ? `${month.averageGlucose.toFixed(0)} mg/dL` : 'Not calculated'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Runs in Month:</span>
              <span>{runCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Estimated Readings:</span>
              <span>{readingCount}</span>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Calculation Options</CardTitle>
          <CardDescription>
            Configure how the A1C calculation should be performed
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2">
            <Switch
              id="weighted-average"
              checked={useWeightedAverage}
              onCheckedChange={setUseWeightedAverage}
            />
            <Label htmlFor="weighted-average">
              Use weighted average based on run duration
            </Label>
          </div>
          <p className="text-sm text-gray-500 mt-2">
            When enabled, runs with longer durations will have more influence on the final A1C calculation.
          </p>
          
          {!hasEnoughData && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md text-yellow-800">
              <p className="text-sm">
                <strong>Warning:</strong> This month doesn&apos;t have any runs yet. Add runs to this month before calculating A1C for more accurate results.
              </p>
            </div>
          )}
        </CardContent>
        <CardFooter>
          <Button 
            onClick={handleCalculate} 
            disabled={isCalculating}
            className="w-full"
          >
            {isCalculating ? 'Calculating...' : 'Calculate A1C'}
          </Button>
        </CardFooter>
      </Card>
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}
      
      <div className="flex justify-between">
        <Link href={`/months/${month.id}`}>
          <Button variant="outline">Back to Month Details</Button>
        </Link>
        <Link href="/months">
          <Button variant="outline">Back to Months</Button>
        </Link>
      </div>
    </div>
  );
}
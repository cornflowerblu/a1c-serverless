'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../../../components/ui/card';
import { Label } from '../../../components/ui/label';
import { Switch } from '../../../components/ui/switch';

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
  const [useWeightedAverage, setUseWeightedAverage] = useState(false);
  
  useEffect(() => {
    async function fetchMonth() {
      try {
        const response = await fetch(`/api/months/${params.id}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch month data');
        }
        
        const data = await response.json();
        setMonth(data.month);
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
        <p>Loading month data...</p>
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
              <span>{month.calculatedA1C ? `${month.calculatedA1C.toFixed(1)}%` : 'Not calculated'}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Current Average Glucose:</span>
              <span>{month.averageGlucose ? `${month.averageGlucose.toFixed(0)} mg/dL` : 'Not calculated'}</span>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Calculation Options</CardTitle>
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
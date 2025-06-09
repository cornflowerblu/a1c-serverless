'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';

interface SummaryData {
  userId: string;
  latestMonth: {
    id: string;
    name: string;
    month: number;
    year: number;
    a1cEstimate: number;
    averageGlucose: number;
  } | null;
  recentReadingsCount: number;
  totalRunsCount: number;
}

export default function DashboardSummary({ userId }: { userId?: string }) {
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSummary() {
      try {
        setLoading(true);
        const url = userId ? `/api/summary?userId=${userId}` : '/api/summary';
        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error(`Error: ${response.status}`);
        }
        
        const data = await response.json();
        setSummary(data.summary);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load summary');
        console.error('Error fetching summary:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchSummary();
  }, [userId]);

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Loading...</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="text-red-500">Error Loading Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <p>{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!summary) {
    return null;
  }

  const getA1CColor = (a1c: number | null | undefined) => {
    if (!a1c) return 'bg-gray-100 text-gray-500';
    if (a1c < 5.7) return 'bg-green-100 text-green-800';
    if (a1c < 6.5) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const getMonthName = (month: number) => {
    return new Date(0, month - 1).toLocaleString('default', { month: 'long' });
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Estimated A1C</CardTitle>
          {summary.latestMonth && (
            <Badge className={getA1CColor(summary.latestMonth.a1cEstimate)}>
              {summary.latestMonth.a1cEstimate ? summary.latestMonth.a1cEstimate.toFixed(1) + '%' : 'N/A'}
            </Badge>
          )}
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {summary.latestMonth ? 
              `${summary.latestMonth.a1cEstimate ? summary.latestMonth.a1cEstimate.toFixed(1) + '%' : 'No data'}` : 
              'No data available'}
          </div>
          <p className="text-xs text-muted-foreground">
            {summary.latestMonth && summary.latestMonth.month ? 
              `Based on ${getMonthName(summary.latestMonth.month)} ${summary.latestMonth.year}` : 
              summary.latestMonth ? `Based on ${summary.latestMonth.name}` : 'Add glucose readings to see estimate'}
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Average Glucose</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {summary.latestMonth?.averageGlucose ? 
              `${summary.latestMonth.averageGlucose.toFixed(0)} mg/dL` : 
              'No data'}
          </div>
          <p className="text-xs text-muted-foreground">
            {summary.latestMonth && summary.latestMonth.month ? 
              `Based on ${getMonthName(summary.latestMonth.month)} ${summary.latestMonth.year}` : 
              summary.latestMonth ? `Based on ${summary.latestMonth.name}` : 'Add glucose readings to see average'}
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Recent Readings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{summary.recentReadingsCount}</div>
          <p className="text-xs text-muted-foreground">In the last 30 days</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Runs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{summary.totalRunsCount}</div>
          <p className="text-xs text-muted-foreground">Completed measurement runs</p>
        </CardContent>
      </Card>
    </div>
  );
}
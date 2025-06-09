'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import type { Month, Run, GlucoseReading } from '@/types/glucose';

interface MonthSummaryProps {
  month: {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
    calculatedA1C: number | null;
    averageGlucose: number | null;
  };
}

export default function MonthSummary({ month }: MonthSummaryProps) {
  const [summary, setSummary] = useState<{
    a1cTrend: 'improving' | 'worsening' | 'stable' | 'unknown';
    timeInRange: number;
    averageReadingsPerDay: number;
    totalRuns: number;
    insights: string[];
    totalReadings: number;
    highReadings: number;
    lowReadings: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSummaryData() {
      try {
        // Fetch the month summary data from the API
        const response = await fetch(`/api/months/${month.id}/summary`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch month summary');
        }
        
        const data = await response.json();
        setSummary(data.summary);
      } catch (err) {
        console.error('Error fetching month summary:', err);
        setError('Could not load month summary data');
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchSummaryData();
  }, [month.id]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Month Summary</CardTitle>
          <CardDescription>Loading summary data...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (error || !summary) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Month Summary</CardTitle>
          <CardDescription>Summary not available</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">
            {error || 'No summary data available for this month yet.'}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Month Summary</CardTitle>
        <CardDescription>
          Key statistics and insights for {month.name}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* A1C Trend */}
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">A1C Trend</h3>
            <div className="flex items-center">
              {summary.a1cTrend === 'improving' && (
                <Badge className="bg-green-100 text-green-800 hover:bg-green-200">
                  Improving
                </Badge>
              )}
              {summary.a1cTrend === 'worsening' && (
                <Badge className="bg-red-100 text-red-800 hover:bg-red-200">
                  Worsening
                </Badge>
              )}
              {summary.a1cTrend === 'stable' && (
                <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200">
                  Stable
                </Badge>
              )}
              {summary.a1cTrend === 'unknown' && (
                <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-200">
                  Unknown
                </Badge>
              )}
            </div>
          </div>

          {/* Time in Range */}
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">Time in Range</h3>
            <div className="relative pt-1">
              <div className="flex mb-2 items-center justify-between">
                <div>
                  <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-blue-600 bg-blue-200">
                    {summary.timeInRange.toFixed(1)}%
                  </span>
                </div>
              </div>
              <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-gray-200">
                <div 
                  style={{ width: `${summary.timeInRange}%` }} 
                  className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500"
                ></div>
              </div>
            </div>
          </div>

          {/* Reading Distribution */}
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">Reading Distribution</h3>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-green-50 p-2 rounded">
                <p className="text-xs text-gray-500">In Range</p>
                <p className="font-bold">
                  {summary.totalReadings > 0 
                    ? ((summary.totalReadings - summary.highReadings - summary.lowReadings) / summary.totalReadings * 100).toFixed(1) 
                    : 0}%
                </p>
              </div>
              <div className="bg-yellow-50 p-2 rounded">
                <p className="text-xs text-gray-500">High</p>
                <p className="font-bold">
                  {summary.totalReadings > 0 
                    ? (summary.highReadings / summary.totalReadings * 100).toFixed(1) 
                    : 0}%
                </p>
              </div>
              <div className="bg-red-50 p-2 rounded">
                <p className="text-xs text-gray-500">Low</p>
                <p className="font-bold">
                  {summary.totalReadings > 0 
                    ? (summary.lowReadings / summary.totalReadings * 100).toFixed(1) 
                    : 0}%
                </p>
              </div>
            </div>
          </div>

          {/* Key Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-medium text-gray-500">Readings/Day</h3>
              <p className="text-lg font-semibold">{summary.averageReadingsPerDay.toFixed(1)}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">Total Runs</h3>
              <p className="text-lg font-semibold">{summary.totalRuns}</p>
            </div>
          </div>

          {/* Insights */}
          {summary.insights.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Insights</h3>
              <ul className="space-y-1 text-sm">
                {summary.insights.map((insight, index) => (
                  <li key={index} className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>{insight}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
"use client";

import Link from "next/link";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { 
  Plus, 
  TrendingUp, 
  Calendar, 
  Activity, 
  BarChart3, 
  Clock,
  ArrowRight,
  Target,
  Zap
} from "lucide-react";

interface GlucoseReading {
  id: string;
  value: number;
  timestamp: string;
  mealContext: string;
}

interface DashboardProps {
  recentReadings: GlucoseReading[];
  totalReadings: number;
  averageGlucose: number | null;
  estimatedA1C: number | null;
  loading: boolean;
  error: string | null;
}

export function Dashboard({ 
  recentReadings, 
  totalReadings, 
  averageGlucose, 
  estimatedA1C,
  loading,
  error
}: DashboardProps) {
  const hasEnoughData = estimatedA1C !== null && averageGlucose !== null;
  const lastReading = recentReadings.length > 0 ? recentReadings[0] : null;

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  // Format time for display
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  // Get A1C status and color
  const getA1cStatus = (a1c: number) => {
    if (a1c < 5.7) return { status: "Normal", color: "bg-green-100 text-green-800 border-green-200" };
    if (a1c < 6.5) return { status: "Prediabetic", color: "bg-yellow-100 text-yellow-800 border-yellow-200" };
    return { status: "Diabetic", color: "bg-red-100 text-red-800 border-red-200" };
  };

  // Calculate A1C progress percentage for the progress bar
  const getA1cProgressPercentage = (a1c: number) => {
    // Scale from 4.0 to 8.0 (common A1C range)
    const min = 4.0;
    const max = 8.0;
    const percentage = ((a1c - min) / (max - min)) * 100;
    return Math.min(Math.max(percentage, 0), 100); // Clamp between 0-100%
  };

  const a1cInfo = estimatedA1C ? getA1cStatus(estimatedA1C) : null;
  const a1cProgressPercentage = estimatedA1C ? getA1cProgressPercentage(estimatedA1C) : 0;

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
          <p className="text-gray-500">
            Loading your health data...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
          <div className="bg-red-50 border border-red-200 text-red-800 rounded-md p-4 mb-4">
            {error}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
        <p className="text-gray-500">
          Track your glucose readings and monitor your health journey
        </p>
      </div>

      {/* Quick Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 mb-1">Current A1C</p>
                <div className="flex items-center gap-2">
                  {hasEnoughData ? (
                    <>
                      <span className="text-2xl">{estimatedA1C?.toFixed(1)}%</span>
                      <Badge variant="outline" className={a1cInfo?.color}>
                        {a1cInfo?.status}
                      </Badge>
                    </>
                  ) : (
                    <span className="text-lg text-gray-500">Not available</span>
                  )}
                </div>
              </div>
              <Target className="w-8 h-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 mb-1">Avg Glucose</p>
                <div className="flex items-center gap-2">
                  {averageGlucose ? (
                    <>
                      <span className="text-2xl">{Math.round(averageGlucose)}</span>
                      <span className="text-sm text-gray-500">mg/dL</span>
                    </>
                  ) : (
                    <span className="text-lg text-gray-500">Not available</span>
                  )}
                </div>
              </div>
              <Activity className="w-8 h-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 mb-1">Total Readings</p>
                <span className="text-2xl">{totalReadings}</span>
              </div>
              <BarChart3 className="w-8 h-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 mb-1">Last Reading</p>
                {lastReading ? (
                  <>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{lastReading.value}</span>
                      <span className="text-sm text-gray-500">mg/dL</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatDate(lastReading.timestamp)} at {formatTime(lastReading.timestamp)}
                    </p>
                  </>
                ) : (
                  <span className="text-lg text-gray-500">No readings</span>
                )}
              </div>
              <Clock className="w-8 h-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Readings */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle>Recent Readings</CardTitle>
            <Link href="/readings/add">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                <Plus className="w-4 h-4 mr-2" />
                Add Reading
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {recentReadings.length > 0 ? (
              <>
                <div className="rounded-md border border-gray-200">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Value</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentReadings.map((reading) => (
                        <TableRow key={reading.id}>
                          <TableCell>
                            <div>
                              <p>{formatDate(reading.timestamp)}</p>
                              <p className="text-xs text-gray-500">{formatTime(reading.timestamp)}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="font-mono">{reading.value} mg/dL</span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="mt-4">
                  <Link href="/readings">
                    <Button 
                      variant="link" 
                      className="text-blue-600 hover:text-blue-800 p-0"
                    >
                      View all readings
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                  </Link>
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">No readings found.</p>
                <Link href="/readings/add">
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                    Add your first reading
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* A1C Estimate */}
        <Card>
          <CardHeader>
            <CardTitle>Estimated A1C</CardTitle>
          </CardHeader>
          <CardContent>
            {hasEnoughData ? (
              <div className="space-y-4">
                <div className="text-center">
                  <div className="text-4xl mb-2">{estimatedA1C?.toFixed(1)}%</div>
                  <Badge variant="outline" className={a1cInfo?.color}>
                    {a1cInfo?.status} Range
                  </Badge>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Normal (&lt;5.7%)</span>
                    <span>Prediabetic (5.7-6.4%)</span>
                    <span>Diabetic (≥6.5%)</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`${estimatedA1C && estimatedA1C < 5.7 ? 'bg-green-500' : estimatedA1C && estimatedA1C < 6.5 ? 'bg-yellow-500' : 'bg-red-500'} h-2 rounded-full`} 
                      style={{ width: `${a1cProgressPercentage}%` }}
                    ></div>
                  </div>
                </div>
                <p className="text-sm text-gray-500 text-center">
                  Based on your last 90 days of readings
                </p>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                  <Zap className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium mb-2">Not enough data to estimate A1C yet</h3>
                <p className="text-gray-500 mb-4">
                  Add more glucose readings to see your estimated A1C.
                </p>
                <Link href="/readings/add">
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                    Add Reading
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link href="/readings/add" className="block">
              <Button 
                variant="outline" 
                className="w-full h-auto p-6 flex flex-col items-center space-y-2"
              >
                <Plus className="w-6 h-6" />
                <span>Add New Reading</span>
              </Button>
            </Link>
            <Link href="/runs" className="block">
              <Button 
                variant="outline" 
                className="w-full h-auto p-6 flex flex-col items-center space-y-2"
              >
                <Calendar className="w-6 h-6" />
                <span>Create New Run</span>
              </Button>
            </Link>
            <Link href="/runs" className="block">
              <Button 
                variant="outline" 
                className="w-full h-auto p-6 flex flex-col items-center space-y-2"
              >
                <TrendingUp className="w-6 h-6" />
                <span>View All Runs</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
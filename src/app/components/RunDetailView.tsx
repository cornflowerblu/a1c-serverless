"use client";

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
import { ArrowLeft, Calendar, Clock, BarChart3, Activity, Hash } from "lucide-react";
import Link from "next/link";

interface Reading {
  id: string;
  userId: string;
  value: number;
  timestamp: string;
  mealContext: string;
  notes?: string;
  runId: string;
  createdAt: string;
  updatedAt: string;
}

interface RunDetailViewProps {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  calculatedA1C: number | null;
  averageGlucose: number | null;
  readings: Reading[];
  createdAt: string;
  updatedAt: string;
  onRecalculate: () => Promise<void>;
  onDelete: () => Promise<void>;
  isRecalculating: boolean;
  isDeleting: boolean;
}

export function RunDetailView({ 
  id,
  name,
  startDate,
  endDate,
  calculatedA1C,
  averageGlucose,
  readings,
  createdAt,
  updatedAt,
  onRecalculate,
  onDelete,
  isRecalculating,
  isDeleting
}: RunDetailViewProps) {
  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  // Format timestamp for display
  const formatTimestamp = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const dateRange = `${formatDate(startDate)} - ${formatDate(endDate)}`;
  const a1cEstimate = calculatedA1C ? `${calculatedA1C.toFixed(1)}%` : 'N/A';
  const avgGlucose = averageGlucose ? `${averageGlucose.toFixed(0)}` : 'N/A';
  const numReadings = readings?.length || 0;
  const created = formatTimestamp(createdAt);
  const lastUpdated = formatTimestamp(updatedAt);

  const getA1cBadgeColor = (a1cValue: string) => {
    if (a1cValue === 'N/A') return 'bg-gray-100 text-gray-800 border-gray-200';
    const value = parseFloat(a1cValue.replace('%', ''));
    if (value < 5.7) return 'bg-green-100 text-green-800 border-green-200';
    if (value < 6.5) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-red-100 text-red-800 border-red-200';
  };

  const getGlucoseStatus = (avgGlucose: string) => {
    if (avgGlucose === 'N/A') return { color: 'text-gray-500', status: 'No data' };
    const value = parseInt(avgGlucose);
    if (value < 120) return { color: 'text-green-600', status: 'Good' };
    if (value < 140) return { color: 'text-yellow-600', status: 'Fair' };
    return { color: 'text-red-600', status: 'High' };
  };

  const glucoseStatus = getGlucoseStatus(avgGlucose);

  // Format meal context for display
  const formatMealContext = (context: string) => {
    return context.replace(/_/g, ' ').toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">{name}</h2>
        <Link href="/runs">
          <Button 
            variant="ghost" 
            className="text-blue-600 hover:text-blue-800 hover:bg-blue-50"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Runs
          </Button>
        </Link>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 mb-1">A1C Estimate</p>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{a1cEstimate}</span>
                  <Badge 
                    variant="outline" 
                    className={getA1cBadgeColor(a1cEstimate)}
                  >
                    {a1cEstimate === 'N/A' ? 'No data' : parseFloat(a1cEstimate.replace('%', '')) < 5.7 ? 'Normal' : parseFloat(a1cEstimate.replace('%', '')) < 6.5 ? 'Prediabetic' : 'Diabetic'}
                  </Badge>
                </div>
              </div>
              <BarChart3 className="w-8 h-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 mb-1">Average Glucose</p>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{avgGlucose === 'N/A' ? 'N/A' : `${avgGlucose} mg/dL`}</span>
                  <span className={`text-sm ${glucoseStatus.color}`}>
                    {glucoseStatus.status}
                  </span>
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
                <span className="text-2xl">{numReadings}</span>
              </div>
              <Hash className="w-8 h-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Run Information */}
      <Card>
        <CardHeader>
          <CardTitle>Run Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-gray-400" />
                <div>
                  <span className="text-gray-500 text-sm">Date Range</span>
                  <p>{dateRange}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="w-4 h-4 text-gray-400" />
                <div>
                  <span className="text-gray-500 text-sm">Created</span>
                  <p>{created}</p>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Clock className="w-4 h-4 text-gray-400" />
                <div>
                  <span className="text-gray-500 text-sm">Last Updated</span>
                  <p>{lastUpdated}</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex gap-3 mt-6 pt-6 border-t">
            <Button 
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={onRecalculate}
              disabled={isRecalculating}
            >
              {isRecalculating ? 'Recalculating...' : 'Recalculate Statistics'}
            </Button>
            <Button 
              variant="destructive"
              onClick={onDelete}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete Run'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Readings Table */}
      <Card>
        <CardHeader>
          <CardTitle>Readings in this Run</CardTitle>
        </CardHeader>
        <CardContent>
          {readings && readings.length > 0 ? (
            <div className="rounded-md border border-gray-200">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Value (mg/dL)</TableHead>
                    <TableHead>Context</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {readings.map((reading) => (
                    <TableRow key={reading.id}>
                      <TableCell>{formatTimestamp(reading.timestamp)}</TableCell>
                      <TableCell>
                        <span className="font-mono">{reading.value}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">
                          {formatMealContext(reading.mealContext)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-gray-500">
                        {reading.notes || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-gray-500">
                <Activity className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium mb-2">No readings found</h3>
                <p>This run doesn&apos;t have any glucose readings yet.</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
"use client";

import Link from "next/link";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
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
  Clock,
  ArrowRight,
} from "lucide-react";
import { AddReadingDialog } from "./add-reading-dialog";

interface GlucoseReading {
  id: string;
  value: number;
  timestamp: string;
  mealContext: string;
}

interface DashboardProps {
  recentReadings: GlucoseReading[];
  loading: boolean;
  error: string | null;
}

export function Dashboard({ 
  recentReadings,
  loading,
  error
}: DashboardProps) {
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

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Readings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-10 bg-gray-200 rounded"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Readings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-red-50 border border-red-200 text-red-800 rounded-md p-4">
            {error}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Recent Readings */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle>Recent Readings</CardTitle>
          <AddReadingDialog />
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
                      <TableHead>Context</TableHead>
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
                        <TableCell>
                          <span className="capitalize">{reading.mealContext.replace('_', ' ')}</span>
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

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button 
              variant="outline" 
              className="w-full h-auto p-6 flex flex-col items-center space-y-2"
              onClick={() => document.getElementById('add-reading-trigger')?.click()}
            >
              <Plus className="w-6 h-6" />
              <span>Add New Reading</span>
            </Button>
            <Link href="/runs?openCreateForm=true" className="block">
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
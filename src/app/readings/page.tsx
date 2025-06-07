'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { GlucoseReadingCard } from '../components/GlucoseReadingCard';

interface GlucoseReading {
  id: string;
  userId: string;
  userName?: string | null;
  value: number;
  timestamp: Date;
  mealContext: string;
  notes?: string;
}

export default function ReadingsPage() {
  const router = useRouter();
  const [readings, setReadings] = useState<GlucoseReading[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filter states
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [mealFilter, setMealFilter] = useState<string>("all");
  
  useEffect(() => {
    const fetchReadings = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/readings');
        
        if (!response.ok) {
          throw new Error('Failed to fetch readings');
        }
        
        const data = await response.json();
        // Convert string timestamps to Date objects
        const formattedReadings = (data.readings || []).map((reading: GlucoseReading) => ({
          ...reading,
          timestamp: new Date(reading.timestamp)
        }));
        setReadings(formattedReadings);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };
    
    fetchReadings();
  }, []);
  
  // Filter functions
  function getGlucoseStatus(value: number): string {
    if (value < 70) return "Low";
    if (value >= 70 && value <= 140) return "Normal";
    if (value > 140 && value <= 180) return "High";
    return "Very High";
  }

  function isWithinDateRange(timestamp: Date, range: string): boolean {
    const date = new Date(timestamp);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Calculate date ranges outside switch to avoid lexical declaration errors
    const week = new Date(today);
    week.setDate(week.getDate() - 7);
    
    const month = new Date(today);
    month.setDate(month.getDate() - 30);

    switch (range) {
      case "today":
        return date >= today;
      case "yesterday":
        return date >= yesterday && date < today;
      case "last7days":
        return date >= week;
      case "last30days":
        return date >= month;
      case "all":
      default:
        return true;
    }
  }
  
  // Format meal context for display
  const formatMealContext = (context: string) => {
    return context.replace(/_/g, ' ').toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };
  
  // Apply filters
  const filteredReadings = readings.filter(reading => {
    // Date filter
    if (!isWithinDateRange(reading.timestamp, dateFilter)) return false;
    
    // Status filter
    if (statusFilter !== "all") {
      const status = getGlucoseStatus(reading.value);
      if (status !== statusFilter) return false;
    }
    
    // Meal context filter
    if (mealFilter !== "all" && reading.mealContext !== mealFilter) return false;
    
    return true;
  });

  // Get unique meal contexts for filter dropdown
  const mealContexts = ["all", ...Array.from(new Set(readings.map(r => r.mealContext)))];
  
  // Calculate stats
  const getOverviewStats = () => {
    if (readings.length === 0) {
      return { avg: 0, low: 0, normal: 0, high: 0, total: 0 };
    }
    
    const values = readings.map(r => r.value);
    const avg = Math.round(values.reduce((sum, val) => sum + val, 0) / values.length);
    const low = readings.filter(r => r.value < 70).length;
    const normal = readings.filter(r => r.value >= 70 && r.value <= 140).length;
    const high = readings.filter(r => r.value > 140).length;
    
    return { avg, low, normal, high, total: readings.length };
  };

  const stats = getOverviewStats();
  
  const clearFilters = () => {
    setDateFilter("all");
    setStatusFilter("all");
    setMealFilter("all");
  };

  const hasActiveFilters = dateFilter !== "all" || statusFilter !== "all" || mealFilter !== "all";
  
  // Group readings by user when there are multiple users
  const readingsByUser = readings.reduce((acc, reading) => {
    // Skip grouping if no userName is present
    if (!reading.userName) {
      return acc;
    }
    
    if (!acc[reading.userId]) {
      acc[reading.userId] = {
        userName: reading.userName,
        readings: []
      };
    }
    acc[reading.userId].readings.push(reading);
    return acc;
  }, {} as Record<string, { userName: string, readings: GlucoseReading[] }>);
  
  const hasMultipleUsers = Object.keys(readingsByUser).length > 1;
  
  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Glucose Readings</h1>
          {hasMultipleUsers ? (
            <p className="text-gray-600 text-sm">Viewing readings for multiple users</p>
          ) : readings.length > 0 && readings[0].userName ? (
            <p className="text-gray-600 text-sm">Viewing readings for {readings[0].userName}</p>
          ) : null}
        </div>
        <Link href="/readings/add">
          <Button className="bg-blue-600 hover:bg-blue-700 text-white">
            Add Reading
          </Button>
        </Link>
      </div>
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-md p-4 mb-6">
          {error}
        </div>
      )}
      
      {loading ? (
        <div className="text-center py-8">
          <p>Loading readings...</p>
        </div>
      ) : readings.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <p className="text-gray-600">No readings found.</p>
          <p className="mt-2">
            <Link 
              href="/readings/add" 
              className="text-blue-600 hover:underline"
            >
              Add your first reading
            </Link>
          </p>
        </div>
      ) : (
        <>
          {/* Overview Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 sm:gap-6 mb-8">
            <div className="text-center bg-white p-4 rounded-lg shadow-sm border border-gray-100">
              <div className="text-2xl font-medium text-gray-900">{stats.total}</div>
              <div className="text-sm text-gray-500">Total</div>
            </div>
            <div className="text-center bg-white p-4 rounded-lg shadow-sm border border-gray-100">
              <div className="text-2xl font-medium text-gray-900">{stats.avg}</div>
              <div className="text-sm text-gray-500">Average</div>
            </div>
            <div className="text-center bg-white p-4 rounded-lg shadow-sm border border-gray-100">
              <div className="text-2xl font-medium text-green-600">{stats.normal}</div>
              <div className="text-sm text-gray-500">Normal</div>
            </div>
            <div className="text-center bg-white p-4 rounded-lg shadow-sm border border-gray-100">
              <div className="text-2xl font-medium text-amber-600">{stats.high}</div>
              <div className="text-sm text-gray-500">High</div>
            </div>
            <div className="text-center bg-white p-4 rounded-lg shadow-sm border border-gray-100">
              <div className="text-2xl font-medium text-red-600">{stats.low}</div>
              <div className="text-sm text-gray-500">Low</div>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
            <span className="text-sm font-medium text-gray-700">Filters:</span>
            
            {/* Date Filter */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-600">Date:</span>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="yesterday">Yesterday</SelectItem>
                  <SelectItem value="last7days">Last 7 Days</SelectItem>
                  <SelectItem value="last30days">Last 30 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-600">Status:</span>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="Normal">Normal</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                  <SelectItem value="Very High">Very High</SelectItem>
                  <SelectItem value="Low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Meal Context Filter */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-600">Context:</span>
              <Select value={mealFilter} onValueChange={setMealFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Contexts</SelectItem>
                  {mealContexts.filter(context => context !== "all").map(context => (
                    <SelectItem key={context} value={context}>
                      {formatMealContext(context)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Results Count & Clear */}
            <div className="flex items-center gap-3 ml-auto">
              <Badge className="bg-blue-100 text-blue-800 border-blue-100">
                {filteredReadings.length} results
              </Badge>
              {hasActiveFilters && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={clearFilters}
                  className="text-xs"
                >
                  Clear Filters
                </Button>
              )}
            </div>
          </div>

          {/* Readings Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredReadings.map((reading) => (
              <GlucoseReadingCard key={reading.id} reading={reading as never} />
            ))}
          </div>

          {filteredReadings.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-500 mb-2">No readings found for the selected filters.</div>
              {hasActiveFilters && (
                <Button variant="outline" onClick={clearFilters} className="text-sm">
                  Clear all filters
                </Button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
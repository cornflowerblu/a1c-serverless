'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

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
    const fetchRecentReadings = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/readings');
        
        if (!response.ok) {
          throw new Error('Failed to fetch readings');
        }
        
        const data = await response.json();
        // Get only the 5 most recent readings
        setRecentReadings((data.readings || []).slice(0, 5));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };
    
    fetchRecentReadings();
  }, []);
  
  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };
  
  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Recent Readings Card */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Recent Readings</h2>
            <Link 
              href="/readings/add" 
              className="bg-blue-600 hover:bg-blue-700 text-white py-1 px-3 rounded text-sm"
            >
              Add Reading
            </Link>
          </div>
          
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 rounded-md p-4 mb-4">
              {error}
            </div>
          )}
          
          {loading ? (
            <div className="text-center py-4">
              <p>Loading readings...</p>
            </div>
          ) : recentReadings.length === 0 ? (
            <div className="text-center py-4 bg-gray-50 rounded-lg">
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
              <div className="overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {recentReadings.map((reading) => (
                      <tr key={reading.id}>
                        <td className="px-4 py-2 whitespace-nowrap text-sm">{formatDate(reading.timestamp)}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm">{reading.value} mg/dL</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 text-right">
                <Link 
                  href="/readings" 
                  className="text-blue-600 hover:underline text-sm"
                >
                  View all readings →
                </Link>
              </div>
            </>
          )}
        </div>
        
        {/* Estimated A1C Card - Placeholder */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Estimated A1C</h2>
          <div className="text-center py-8">
            <p className="text-gray-500">
              Not enough data to estimate A1C yet.
            </p>
            <p className="mt-2 text-sm text-gray-500">
              Add more glucose readings to see your estimated A1C.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
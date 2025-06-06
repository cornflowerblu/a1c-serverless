'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface GlucoseReading {
  id: string;
  value: number;
  timestamp: string;
  mealContext: string;
  notes?: string;
}

export default function ReadingsPage() {
  const router = useRouter();
  const [readings, setReadings] = useState<GlucoseReading[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchReadings = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/readings');
        
        if (!response.ok) {
          throw new Error('Failed to fetch readings');
        }
        
        const data = await response.json();
        setReadings(data.readings || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };
    
    fetchReadings();
  }, []);
  
  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };
  
  // Format meal context for display
  const formatMealContext = (context: string) => {
    return context.replace(/_/g, ' ').toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };
  
  return (
    <div className="max-w-6xl mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Glucose Readings</h1>
        <Link 
          href="/readings/add" 
          className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded"
        >
          Add Reading
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
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200">
            <thead>
              <tr className="bg-gray-50">
                <th className="py-2 px-4 border-b text-left">Date & Time</th>
                <th className="py-2 px-4 border-b text-left">Value (mg/dL)</th>
                <th className="py-2 px-4 border-b text-left">Meal Context</th>
                <th className="py-2 px-4 border-b text-left">Notes</th>
              </tr>
            </thead>
            <tbody>
              {readings.map((reading) => (
                <tr key={reading.id} className="hover:bg-gray-50">
                  <td className="py-2 px-4 border-b">{formatDate(reading.timestamp)}</td>
                  <td className="py-2 px-4 border-b">{reading.value}</td>
                  <td className="py-2 px-4 border-b">{formatMealContext(reading.mealContext)}</td>
                  <td className="py-2 px-4 border-b">{reading.notes || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
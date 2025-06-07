'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Run {
  id: string;
  userId: string;
  name: string;
  startDate: string;
  endDate: string;
  calculatedA1C: number | null;
  averageGlucose: number | null;
  monthId: string | null;
  createdAt: string;
  updatedAt: string;
  readings: Reading[];
}

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

export default function RunDetailPage({ params }: { params: { id: string } }) {
  const id = React.use(params).id;
  const [run, setRun] = useState<Run | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recalculating, setRecalculating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();

  // Fetch run details on component mount
  useEffect(() => {
    async function fetchRun() {
      try {
        const response = await fetch(`/api/runs/${id}`);
        if (!response.ok) {
          throw new Error('Failed to fetch run details');
        }
        const data = await response.json();
        setRun(data.run);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    }

    fetchRun();
  }, [id]);

  // Handle recalculate button click
  const handleRecalculate = async () => {
    try {
      setRecalculating(true);
      const response = await fetch(`/api/runs/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recalculate: true,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to recalculate run statistics');
      }

      const data = await response.json();
      setRun(data.run);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setRecalculating(false);
    }
  };

  // Handle delete button click
  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this run?')) {
      return;
    }

    try {
      setDeleting(true);
      const response = await fetch(`/api/runs/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete run');
      }

      router.push('/runs');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setDeleting(false);
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  // Format timestamp for display
  const formatTimestamp = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return <div className="container mx-auto px-4 py-8">Loading run details...</div>;
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
        <Link href="/runs" className="text-blue-500 hover:text-blue-700">
          Back to Runs
        </Link>
      </div>
    );
  }

  if (!run) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4">
          Run not found
        </div>
        <Link href="/runs" className="text-blue-500 hover:text-blue-700">
          Back to Runs
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">{run.name}</h1>
        <Link href="/runs" className="text-blue-500 hover:text-blue-700">
          Back to Runs
        </Link>
      </div>

      {/* Run details */}
      <div className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-6">
        <h2 className="text-xl font-semibold mb-4">Run Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <p className="text-gray-700 mb-2">
              <span className="font-semibold">Date Range:</span> {formatDate(run.startDate)} - {formatDate(run.endDate)}
            </p>
            <p className="text-gray-700 mb-2">
              <span className="font-semibold">Created:</span> {formatTimestamp(run.createdAt)}
            </p>
            <p className="text-gray-700 mb-2">
              <span className="font-semibold">Last Updated:</span> {formatTimestamp(run.updatedAt)}
            </p>
          </div>
          <div>
            <p className="text-gray-700 mb-2">
              <span className="font-semibold">A1C Estimate:</span>{' '}
              {run.calculatedA1C ? run.calculatedA1C.toFixed(1) + '%' : 'Not calculated'}
            </p>
            <p className="text-gray-700 mb-2">
              <span className="font-semibold">Average Glucose:</span>{' '}
              {run.averageGlucose ? run.averageGlucose.toFixed(0) + ' mg/dL' : 'Not calculated'}
            </p>
            <p className="text-gray-700 mb-2">
              <span className="font-semibold">Number of Readings:</span> {run.readings?.length || 0}
            </p>
          </div>
        </div>
        <div className="flex space-x-4">
          <button
            onClick={handleRecalculate}
            disabled={recalculating}
            className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
          >
            {recalculating ? 'Recalculating...' : 'Recalculate Statistics'}
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
          >
            {deleting ? 'Deleting...' : 'Delete Run'}
          </button>
        </div>
      </div>

      {/* Readings list */}
      <div className="bg-white shadow-md rounded px-8 pt-6 pb-8">
        <h2 className="text-xl font-semibold mb-4">Readings in this Run</h2>
        {run.readings && run.readings.length === 0 ? (
          <p>No readings in this run yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white">
              <thead>
                <tr>
                  <th className="py-2 px-4 border-b border-gray-200 bg-gray-50 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Date & Time
                  </th>
                  <th className="py-2 px-4 border-b border-gray-200 bg-gray-50 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Value (mg/dL)
                  </th>
                  <th className="py-2 px-4 border-b border-gray-200 bg-gray-50 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Context
                  </th>
                  <th className="py-2 px-4 border-b border-gray-200 bg-gray-50 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Notes
                  </th>
                </tr>
              </thead>
              <tbody>
                {run.readings?.map((reading) => (
                  <tr key={reading.id}>
                    <td className="py-2 px-4 border-b border-gray-200">
                      {formatTimestamp(reading.timestamp)}
                    </td>
                    <td className="py-2 px-4 border-b border-gray-200">
                      {reading.value}
                    </td>
                    <td className="py-2 px-4 border-b border-gray-200">
                      {reading.mealContext.replace(/_/g, ' ')}
                    </td>
                    <td className="py-2 px-4 border-b border-gray-200">
                      {reading.notes || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
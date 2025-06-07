'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { RunDetailView } from '@/app/components/RunDetailView';

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

      // After recalculation, fetch the full run details again to get updated stats and readings
      const updatedResponse = await fetch(`/api/runs/${id}`);
      if (!updatedResponse.ok) {
        throw new Error('Failed to fetch updated run details');
      }
      
      const updatedData = await updatedResponse.json();
      setRun(updatedData.run);
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

  if (loading) {
    return <div className="container mx-auto px-4 py-8">Loading run details...</div>;
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
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
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-lg mb-4">
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
      <RunDetailView
        id={run.id}
        name={run.name}
        startDate={run.startDate}
        endDate={run.endDate}
        calculatedA1C={run.calculatedA1C}
        averageGlucose={run.averageGlucose}
        readings={run.readings}
        createdAt={run.createdAt}
        updatedAt={run.updatedAt}
        onRecalculate={handleRecalculate}
        onDelete={handleDelete}
        isRecalculating={recalculating}
        isDeleting={deleting}
      />
    </div>
  );
}
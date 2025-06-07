'use client';

import { useState, useEffect } from 'react';

interface Run {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
}

interface AssociateRunProps {
  readingId: string;
  onAssociated: () => void;
}

export default function AssociateRun({ readingId, onAssociated }: AssociateRunProps) {
  const [runs, setRuns] = useState<Run[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Fetch available runs
  useEffect(() => {
    async function fetchRuns() {
      try {
        const response = await fetch('/api/runs');
        if (!response.ok) {
          throw new Error('Failed to fetch runs');
        }
        const data = await response.json();
        setRuns(data.runs || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      }
    }

    fetchRuns();
  }, []);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedRunId) {
      setError('Please select a run');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/runs/readings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          readingId,
          runId: selectedRunId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to associate reading with run');
      }

      setSuccess(true);
      onAssociated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (success) {
    return (
      <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
        Reading successfully associated with run!
      </div>
    );
  }

  return (
    <div className="mt-6">
      <h3 className="text-lg font-semibold mb-2">Associate with Run</h3>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      {runs.length === 0 ? (
        <p>No runs available. <a href="/runs" className="text-blue-500 hover:text-blue-700">Create a run</a> first.</p>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="runId">
              Select Run
            </label>
            <select
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              id="runId"
              value={selectedRunId}
              onChange={(e) => setSelectedRunId(e.target.value)}
              required
            >
              <option value="">-- Select a Run --</option>
              {runs.map((run) => (
                <option key={run.id} value={run.id}>
                  {run.name} ({formatDate(run.startDate)} - {formatDate(run.endDate)})
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
          >
            {loading ? 'Associating...' : 'Associate with Run'}
          </button>
        </form>
      )}
    </div>
  );
}
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CreateRunForm } from '../components/CreateRunForm';
import { RunCard } from '../components/RunCard';
import { RunsFilter } from '../components/RunsFilter';
import { Card, CardContent } from '../components/ui/card';
import { Activity } from 'lucide-react';

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
}

export default function RunsPage() {
  const [runs, setRuns] = useState<Run[]>([]);
  const [filteredRuns, setFilteredRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Fetch runs on component mount
  useEffect(() => {
    async function fetchRuns() {
      try {
        const response = await fetch('/api/runs');
        if (!response.ok) {
          throw new Error('Failed to fetch runs');
        }
        const data = await response.json();
        const fetchedRuns = data.runs || [];
        setRuns(fetchedRuns);
        setFilteredRuns(fetchedRuns);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    }

    fetchRuns();
  }, []);

  // Handle form submission to create a new run
  const handleSubmit = async (formData: { name: string; startDate: string; endDate: string }) => {
    try {
      setIsSubmitting(true);
      setError(null);
      
      const response = await fetch('/api/runs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create run');
      }

      // Fetch updated runs
      const updatedResponse = await fetch('/api/runs');
      const updatedData = await updatedResponse.json();
      const updatedRuns = updatedData.runs || [];
      setRuns(updatedRuns);
      setFilteredRuns(updatedRuns);
      
      // Refresh the page to show the new run
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle filter changes
  const handleFilterChange = (filters: { search: string; a1cStatus: string; sortBy: string }) => {
    let result = [...runs];
    
    // Apply search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter(run => 
        run.name.toLowerCase().includes(searchLower)
      );
    }
    
    // Apply A1C status filter
    if (filters.a1cStatus !== 'all') {
      result = result.filter(run => {
        if (!run.calculatedA1C) return filters.a1cStatus === 'na';
        
        const a1c = run.calculatedA1C;
        switch (filters.a1cStatus) {
          case 'normal':
            return a1c < 5.7;
          case 'prediabetic':
            return a1c >= 5.7 && a1c < 6.5;
          case 'diabetic':
            return a1c >= 6.5;
          case 'na':
            return a1c === null;
          default:
            return true;
        }
      });
    }
    
    // Apply sorting
    result.sort((a, b) => {
      switch (filters.sortBy) {
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'a1c-high':
          if (a.calculatedA1C === null) return 1;
          if (b.calculatedA1C === null) return -1;
          return b.calculatedA1C - a.calculatedA1C;
        case 'a1c-low':
          if (a.calculatedA1C === null) return 1;
          if (b.calculatedA1C === null) return -1;
          return a.calculatedA1C - b.calculatedA1C;
        case 'name':
          return a.name.localeCompare(b.name);
        case 'recent':
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });
    
    setFilteredRuns(result);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">Runs</h1>
          <p className="text-gray-500">
            View and manage your glucose tracking runs
          </p>
        </div>
      </div>
      
      {/* Error message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}
      
      {/* Create new run form */}
      <CreateRunForm onSubmit={handleSubmit} isSubmitting={isSubmitting} />
      
      {/* Runs list */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Your Runs ({runs.length})</h2>
        </div>
        
        {/* Filters */}
        {!loading && runs.length > 0 && (
          <RunsFilter 
            totalRuns={filteredRuns.length} 
            onFilterChange={handleFilterChange} 
          />
        )}
        
        {loading ? (
          <div className="text-center py-8">
            <p>Loading runs...</p>
          </div>
        ) : runs.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <div className="text-gray-500">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                  <Activity className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-medium mb-2">No runs found</h3>
                <p>Create your first glucose tracking run to get started</p>
              </div>
            </CardContent>
          </Card>
        ) : filteredRuns.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <div className="text-gray-500 mb-2">No runs found for the selected filters.</div>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredRuns.map((run) => (
              <RunCard 
                key={run.id} 
                {...run}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )}

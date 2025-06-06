'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { GlucoseReadingForm } from '@/app/components/glucose-reading-form';
import type { GlucoseReadingInput } from '@/utils/schemas/glucose-schema';

export default function AddReadingPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  
  const handleSubmit = async (data: GlucoseReadingInput) => {
    try {
      setError(null);
      
      const response = await fetch('/api/readings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create reading');
      }
      
      router.push('/readings');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };
  
  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Add Glucose Reading</h1>
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-md p-4 mb-6">
          {error}
        </div>
      )}
      
      <GlucoseReadingForm onSubmit={handleSubmit} />
      
      <div className="mt-4">
        <button
          onClick={() => router.back()}
          className="text-gray-600 hover:text-gray-800"
        >
          ← Back
        </button>
      </div>
    </div>
  );
}
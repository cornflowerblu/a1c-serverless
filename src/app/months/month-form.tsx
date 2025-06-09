'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';

// Define the form schema with Zod
const monthSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  startDate: z.string().refine(date => !isNaN(Date.parse(date)), {
    message: 'Invalid start date format'
  }),
  endDate: z.string().refine(date => !isNaN(Date.parse(date)), {
    message: 'Invalid end date format'
  })
}).refine(data => {
  const start = new Date(data.startDate);
  const end = new Date(data.endDate);
  return end >= start;
}, {
  message: 'End date must be after start date',
  path: ['endDate']
});

type MonthFormData = z.infer<typeof monthSchema>;

interface MonthFormProps {
  initialData?: {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
  };
}

export default function MonthForm({ initialData }: MonthFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Set default dates if not editing
  const today = new Date();
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  
  const defaultValues = initialData ? {
    name: initialData.name,
    startDate: initialData.startDate.split('T')[0], // Format as YYYY-MM-DD
    endDate: initialData.endDate.split('T')[0]
  } : {
    name: `${today.toLocaleString('default', { month: 'long' })} ${today.getFullYear()}`,
    startDate: firstDayOfMonth.toISOString().split('T')[0],
    endDate: lastDayOfMonth.toISOString().split('T')[0]
  };
  
  const { register, handleSubmit, formState: { errors }, watch } = useForm<MonthFormData>({
    resolver: zodResolver(monthSchema),
    defaultValues
  });
  
  const onSubmit = async (data: MonthFormData) => {
    setIsSubmitting(true);
    setError(null);
    
    try {
      const response = await fetch(initialData ? `/api/months/${initialData.id}` : '/api/months', {
        method: initialData ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save month');
      }
      
      router.push('/months');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Watch form values for date preview
  const startDateValue = watch('startDate');
  const endDateValue = watch('endDate');
  
  // Calculate days in month for preview
  const startDate = new Date(startDateValue);
  const endDate = new Date(endDateValue);
  const daysDiff = !isNaN(startDate.getTime()) && !isNaN(endDate.getTime()) 
    ? Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
    : 0;
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>{initialData ? 'Edit Month' : 'Create Month'}</CardTitle>
        <CardDescription>
          {initialData 
            ? 'Update the details for this month' 
            : 'Create a new month to organize your glucose readings and runs'}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-2">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="name">Month Name</Label>
            <Input
              id="name"
              {...register('name')}
              placeholder="e.g. January 2023"
              className={errors.name ? 'border-red-300' : ''}
            />
            {errors.name && (
              <p className="text-sm text-red-500">{errors.name.message}</p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="startDate">Start Date</Label>
            <Input
              id="startDate"
              type="date"
              {...register('startDate')}
              className={errors.startDate ? 'border-red-300' : ''}
            />
            {errors.startDate && (
              <p className="text-sm text-red-500">{errors.startDate.message}</p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="endDate">End Date</Label>
            <Input
              id="endDate"
              type="date"
              {...register('endDate')}
              className={errors.endDate ? 'border-red-300' : ''}
            />
            {errors.endDate && (
              <p className="text-sm text-red-500">{errors.endDate.message}</p>
            )}
          </div>
          
          {/* Date range preview */}
          {daysDiff > 0 && !errors.startDate && !errors.endDate && (
            <div className="bg-blue-50 p-3 rounded text-sm">
              <p>This month will span <strong>{daysDiff} days</strong> from {startDate.toLocaleDateString()} to {endDate.toLocaleDateString()}</p>
            </div>
          )}
          
          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : initialData ? 'Update Month' : 'Create Month'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )};
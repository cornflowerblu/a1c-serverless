import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { glucoseReadingSchema, type GlucoseReadingInput } from '@/utils/schemas/glucose-schema';
import type { MealContext } from '@/types/glucose';

interface GlucoseReadingFormProps {
  onSubmit: (data: GlucoseReadingInput) => Promise<void>;
  initialData?: Partial<GlucoseReadingInput>;
}

export function GlucoseReadingForm({ onSubmit, initialData }: GlucoseReadingFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Set up form with validation
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm<GlucoseReadingInput>({
    resolver: zodResolver(glucoseReadingSchema),
    defaultValues: {
      value: initialData?.value || undefined,
      timestamp: initialData?.timestamp || new Date().toISOString().slice(0, 16),
      mealContext: initialData?.mealContext || undefined,
      notes: initialData?.notes || '',
      runId: initialData?.runId
    }
  });
  
  // Define meal context options
  const mealContextOptions: { value: MealContext; label: string }[] = [
    { value: 'BEFORE_BREAKFAST', label: 'Before Breakfast' },
    { value: 'AFTER_BREAKFAST', label: 'After Breakfast' },
    { value: 'BEFORE_LUNCH', label: 'Before Lunch' },
    { value: 'AFTER_LUNCH', label: 'After Lunch' },
    { value: 'BEFORE_DINNER', label: 'Before Dinner' },
    { value: 'AFTER_DINNER', label: 'After Dinner' },
    { value: 'BEDTIME', label: 'Bedtime' },
    { value: 'WAKEUP', label: 'Wake Up' },
    { value: 'FASTING', label: 'Fasting' },
    { value: 'OTHER', label: 'Other' }
  ];
  
  // Handle form submission
  const handleFormSubmit = async (data: GlucoseReadingInput) => {
    try {
      setIsSubmitting(true);
      await onSubmit(data);
      reset(); // Reset form after successful submission
    } catch (error) {
      console.error('Error submitting glucose reading:', error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      <div>
        <label htmlFor="value" className="block text-sm font-medium text-gray-700">
          Glucose Value (mg/dL)
        </label>
        <input
          id="value"
          type="number"
          {...register('value')}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          placeholder="Enter glucose value"
          disabled={isSubmitting}
        />
        {errors.value && (
          <p className="mt-1 text-sm text-red-600">{errors.value.message}</p>
        )}
      </div>
      
      <div>
        <label htmlFor="timestamp" className="block text-sm font-medium text-gray-700">
          Date and Time
        </label>
        <input
          id="timestamp"
          type="datetime-local"
          {...register('timestamp')}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          disabled={isSubmitting}
        />
        {errors.timestamp && (
          <p className="mt-1 text-sm text-red-600">{errors.timestamp.message}</p>
        )}
      </div>
      
      <div>
        <label htmlFor="mealContext" className="block text-sm font-medium text-gray-700">
          Meal Context
        </label>
        <select
          id="mealContext"
          {...register('mealContext')}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          disabled={isSubmitting}
        >
          <option value="">Select meal context</option>
          {mealContextOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {errors.mealContext && (
          <p className="mt-1 text-sm text-red-600">
            {errors.mealContext.message || 'Meal context is required'}
          </p>
        )}
      </div>
      
      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
          Notes
        </label>
        <textarea
          id="notes"
          {...register('notes')}
          rows={3}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          placeholder="Optional notes about this reading"
          disabled={isSubmitting}
        />
        {errors.notes && (
          <p className="mt-1 text-sm text-red-600">{errors.notes.message}</p>
        )}
      </div>
      
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
        >
          {isSubmitting ? 'Saving...' : 'Save Reading'}
        </button>
      </div>
    </form>
  );
}
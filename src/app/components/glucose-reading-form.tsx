import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { glucoseReadingSchema, type GlucoseReadingInput } from '@/utils/schemas/glucose-schema';
import type { MealContext } from '@/types/glucose';

// Helper function to format date for datetime-local input
function formatDateTimeLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

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
      timestamp: initialData?.timestamp || formatDateTimeLocal(new Date()),
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
  const handleFormSubmit = async (formData: GlucoseReadingInput) => {
    try {
      setIsSubmitting(true);
      
      // Ensure timestamp is in proper ISO format with timezone
      // Create a new Date object from the input and ensure it's not in the future
      let timestamp = formData.timestamp ? new Date(formData.timestamp) : new Date();
      const now = new Date();
      
      // If timestamp is in the future, use current time instead
      if (timestamp > now) {
        timestamp = now;
      }
      
      const data = {
        ...formData,
        timestamp: timestamp.toISOString()
      };
      
      await onSubmit(data);
      reset(); // Reset form after successful submission
    } catch (error) {
      console.error('Error submitting glucose reading:', error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4" data-testid="glucose-form">
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
          data-testid="glucose-value-input"
        />
        {errors.value && (
          <p className="mt-1 text-sm text-red-600" data-testid="value-error">{errors.value.message}</p>
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
          data-testid="timestamp-input"
        />
        {errors.timestamp && (
          <p className="mt-1 text-sm text-red-600" data-testid="timestamp-error">
            {errors.timestamp.message?.includes('future') 
              ? 'Timestamp cannot be in the future' 
              : errors.timestamp.message}
          </p>
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
          data-testid="meal-context-select"
        >
          <option value="">Select meal context</option>
          {mealContextOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {errors.mealContext && (
          <p className="mt-1 text-sm text-red-600" data-testid="meal-context-error">
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
          data-testid="notes-input"
        />
        {errors.notes && (
          <p className="mt-1 text-sm text-red-600" data-testid="notes-error">{errors.notes.message}</p>
        )}
      </div>
      
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
          data-testid="submit-button"
        >
          {isSubmitting ? 'Saving...' : 'Save Reading'}
        </button>
      </div>
    </form>
  );
}
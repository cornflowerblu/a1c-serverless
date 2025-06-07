"use client";

import { useState } from "react";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { glucoseReadingSchema, type GlucoseReadingInput } from "@/utils/schemas/glucose-schema";
import type { MealContext } from "@/types/glucose";
import { useRouter } from "next/navigation";

// Helper function to format date for datetime-local input
function formatDateTimeLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export function AddReadingDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Set up form with validation
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<GlucoseReadingInput>({
    resolver: zodResolver(glucoseReadingSchema),
    defaultValues: {
      value: undefined,
      timestamp: formatDateTimeLocal(new Date()),
      mealContext: undefined,
      notes: "",
    },
  });

  // Define meal context options
  const mealContextOptions: { value: MealContext; label: string }[] = [
    { value: "BEFORE_BREAKFAST", label: "Before Breakfast" },
    { value: "AFTER_BREAKFAST", label: "After Breakfast" },
    { value: "BEFORE_LUNCH", label: "Before Lunch" },
    { value: "AFTER_LUNCH", label: "After Lunch" },
    { value: "BEFORE_DINNER", label: "Before Dinner" },
    { value: "AFTER_DINNER", label: "After Dinner" },
    { value: "BEDTIME", label: "Bedtime" },
    { value: "WAKEUP", label: "Wake Up" },
    { value: "FASTING", label: "Fasting" },
    { value: "OTHER", label: "Other" },
  ];

  // Handle form submission
  const handleFormSubmit = async (formData: GlucoseReadingInput) => {
    try {
      setIsSubmitting(true);
      setError(null);

      // Ensure timestamp is in proper ISO format with timezone
      let timestamp = formData.timestamp ? new Date(formData.timestamp) : new Date();
      const now = new Date();

      // If timestamp is in the future, use current time instead
      if (timestamp > now) {
        timestamp = now;
      }

      const data = {
        ...formData,
        timestamp: timestamp.toISOString(),
      };

      const response = await fetch("/api/readings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create reading");
      }

      // Close dialog and reset form on success
      setOpen(false);
      reset();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button id="add-reading-trigger" className="bg-blue-600 hover:bg-blue-700 text-white">
          Add Reading
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Add Glucose Reading</DialogTitle>
        </DialogHeader>
        
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 rounded-md p-3 text-sm">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="value" className="text-gray-700">
              Glucose Value (mg/dL)
            </Label>
            <Input
              id="value"
              type="number"
              placeholder="Enter glucose value"
              {...register("value")}
              disabled={isSubmitting}
              data-testid="glucose-value-input"
            />
            {errors.value && (
              <p className="text-sm text-red-600" data-testid="value-error">
                {errors.value.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="timestamp" className="text-gray-700">
              Date and Time
            </Label>
            <Input
              id="timestamp"
              type="datetime-local"
              {...register("timestamp")}
              disabled={isSubmitting}
              data-testid="timestamp-input"
            />
            {errors.timestamp && (
              <p className="text-sm text-red-600" data-testid="timestamp-error">
                {errors.timestamp.message?.includes("future")
                  ? "Timestamp cannot be in the future"
                  : errors.timestamp.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="mealContext" className="text-gray-700">
              Meal Context
            </Label>
            <select
              id="mealContext"
              {...register("mealContext")}
              className="flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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
              <p className="text-sm text-red-600" data-testid="meal-context-error">
                {errors.mealContext.message || "Meal context is required"}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes" className="text-gray-700">
              Notes
            </Label>
            <Textarea
              id="notes"
              {...register("notes")}
              placeholder="Optional notes about this reading"
              disabled={isSubmitting}
              data-testid="notes-input"
            />
            {errors.notes && (
              <p className="text-sm text-red-600" data-testid="notes-error">
                {errors.notes.message}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-blue-600 hover:bg-blue-700 text-white"
              data-testid="submit-button"
            >
              {isSubmitting ? "Saving..." : "Save Reading"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
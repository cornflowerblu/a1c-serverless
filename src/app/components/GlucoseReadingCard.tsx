"use client";

import { Badge } from "./ui/badge";
import { GlucoseReading } from "@/types/glucose";

interface GlucoseReadingCardProps {
  reading: GlucoseReading;
}

function getGlucoseStatus(value: number) {
  if (value < 70) return { status: "Low", color: "bg-red-50 text-red-700 border-red-100" };
  if (value >= 70 && value <= 140) return { status: "Normal", color: "bg-green-50 text-green-700 border-green-100" };
  if (value > 140 && value <= 180) return { status: "High", color: "bg-amber-50 text-amber-700 border-amber-100" };
  return { status: "Very High", color: "bg-red-50 text-red-700 border-red-100" };
}

function formatDateTime(timestamp: Date) {
  const date = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  // Compare dates without time components
  const isToday = date.toDateString() === today.toDateString();
  const isYesterday = date.toDateString() === yesterday.toDateString();

  const timeString = date.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true 
  });

  if (isToday) {
    return { date: "Today", time: timeString };
  } else if (isYesterday) {
    return { date: "Yesterday", time: timeString };
  } else {
    return { 
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), 
      time: timeString 
    };
  }
}

function formatMealContext(context: string) {
  return context.replace(/_/g, ' ').toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function GlucoseReadingCard({ reading }: GlucoseReadingCardProps) {
  const { status, color } = getGlucoseStatus(reading.value);
  const { date, time } = formatDateTime(reading.timestamp);
  const mealContext = formatMealContext(reading.mealContext);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 cursor-pointer transform transition-all duration-200 ease-out hover:scale-[1.02] hover:shadow-lg hover:border-gray-300 hover:bg-gray-50/50 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="text-xl font-medium text-gray-900 transition-colors duration-200">
            {reading.value}
          </span>
          <span className="text-sm text-gray-500">mg/dL</span>
          <Badge className={`${color} text-xs px-2 py-0.5 transition-all duration-200`}>
            {status}
          </Badge>
        </div>
        <div className="text-right text-sm">
          <div className="text-gray-900 transition-colors duration-200">{date}</div>
          <div className="text-gray-500 transition-colors duration-200">{time}</div>
        </div>
      </div>
      
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-600 transition-colors duration-200">{mealContext}</span>
        {reading.notes && reading.notes !== "-" && (
          <span className="text-xs text-gray-500 italic transition-colors duration-200">Has notes</span>
        )}
      </div>
      
      {reading.notes && reading.notes !== "-" && (
        <div className="mt-3 pt-3 border-t border-gray-50 transition-colors duration-200">
          <p className="text-sm text-gray-600">{reading.notes}</p>
        </div>
      )}
    </div>
  );
}
"use client";

import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Calendar, Activity, TrendingUp } from "lucide-react";
import Link from "next/link";

interface RunCardProps {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  calculatedA1C: number | null;
  averageGlucose: number | null;
}

export function RunCard({ id, name, startDate, endDate, calculatedA1C, averageGlucose }: RunCardProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const dateRange = `${formatDate(startDate)} - ${formatDate(endDate)}`;
  const a1c = calculatedA1C ? calculatedA1C.toFixed(1) : "N/A";
  const avgGlucose = averageGlucose ? averageGlucose.toFixed(0) : "N/A";

  const getA1cBadgeColor = (a1cValue: string) => {
    if (a1cValue === "N/A") return "bg-gray-100 text-gray-800 border-gray-200";
    const value = parseFloat(a1cValue);
    if (value < 5.7) return "bg-green-100 text-green-800 border-green-200";
    if (value < 6.5) return "bg-yellow-100 text-yellow-800 border-yellow-200";
    return "bg-red-100 text-red-800 border-red-200";
  };

  return (
    <Card className="p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-4">
            <h3 className="text-lg font-medium truncate">{name}</h3>
            <Badge 
              variant="outline" 
              className={getA1cBadgeColor(a1c)}
            >
              A1C: {a1c === "N/A" ? "N/A" : `${a1c}%`}
            </Badge>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-gray-500">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span className="truncate">{dateRange}</span>
            </div>
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              <span>Avg: {avgGlucose === "N/A" ? "N/A" : `${avgGlucose} mg/dL`}</span>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              <span>Multiple readings</span>
            </div>
          </div>
        </div>
        
        <div className="ml-6 flex-shrink-0">
          <Link href={`/runs/${id}`}>
            <Button 
              size="lg" 
              className="px-8 bg-blue-600 hover:bg-blue-700 text-white"
            >
              View
            </Button>
          </Link>
        </div>
      </div>
    </Card>
  );
}
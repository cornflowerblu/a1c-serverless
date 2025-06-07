"use client";

import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card } from "./ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./ui/accordion";
import { Plus } from "lucide-react";

interface CreateRunFormProps {
  onSubmit: (data: { name: string; startDate: string; endDate: string }) => Promise<void>;
  isSubmitting: boolean;
}

export function CreateRunForm({ onSubmit, isSubmitting }: CreateRunFormProps) {
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({ name, startDate, endDate });
    // Form will be reset by parent component after successful submission
  };

  return (
    <Card className="mb-8 border-blue-200 shadow-md">
      <Accordion type="single" collapsible className="w-full" defaultValue="create-run">
        <AccordionItem value="create-run" className="border-0">
          <AccordionTrigger className="px-6 py-4 hover:no-underline bg-blue-50 text-blue-700 rounded-t-xl">
            <div className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              <span className="font-medium">Create New Run</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="runName">Run Name</Label>
                <Input 
                  id="runName" 
                  placeholder="Enter run name" 
                  className="mt-1"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input 
                    id="startDate" 
                    type="date" 
                    className="mt-1"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="endDate">End Date</Label>
                  <Input 
                    id="endDate" 
                    type="date" 
                    className="mt-1"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    required
                  />
                </div>
              </div>
              
              <Button 
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Creating..." : "Create Run"}
              </Button>
            </form>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </Card>
  );
}
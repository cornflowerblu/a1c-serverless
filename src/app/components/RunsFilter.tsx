"use client";

import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Search, Filter } from "lucide-react";

interface RunsFilterProps {
  totalRuns: number;
  onFilterChange: (filters: {
    search: string;
    a1cStatus: string;
    sortBy: string;
  }) => void;
}

export function RunsFilter({ totalRuns, onFilterChange }: RunsFilterProps) {
  const [search, setSearch] = useState("");
  const [a1cStatus, setA1cStatus] = useState("all");
  const [sortBy, setSortBy] = useState("recent");
  
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newSearch = e.target.value;
    setSearch(newSearch);
    onFilterChange({ search: newSearch, a1cStatus, sortBy });
  };
  
  const handleA1cStatusChange = (value: string) => {
    setA1cStatus(value);
    onFilterChange({ search, a1cStatus: value, sortBy });
  };
  
  const handleSortChange = (value: string) => {
    setSortBy(value);
    onFilterChange({ search, a1cStatus, sortBy: value });
  };
  
  const clearFilters = () => {
    setSearch("");
    setA1cStatus("all");
    setSortBy("recent");
    onFilterChange({ search: "", a1cStatus: "all", sortBy: "recent" });
  };
  
  const hasActiveFilters = search !== "" || a1cStatus !== "all" || sortBy !== "recent";

  return (
    <div className="flex flex-wrap items-center gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
      <span className="text-sm font-medium text-gray-700">Filters:</span>
      
      {/* Search Filter */}
      <div className="relative flex-1 max-w-xs">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-4 h-4" />
        <Input 
          placeholder="Search runs..." 
          className="pl-10"
          value={search}
          onChange={handleSearchChange}
        />
      </div>

      {/* A1C Status Filter */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-600">A1C Status:</span>
        <Select value={a1cStatus} onValueChange={handleA1cStatusChange}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="normal">Normal</SelectItem>
            <SelectItem value="prediabetic">Pre-diabetic</SelectItem>
            <SelectItem value="diabetic">Diabetic</SelectItem>
            <SelectItem value="na">No Data</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Sort Filter */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-600">Sort By:</span>
        <Select value={sortBy} onValueChange={handleSortChange}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">Most Recent</SelectItem>
            <SelectItem value="oldest">Oldest First</SelectItem>
            <SelectItem value="a1c-high">Highest A1C</SelectItem>
            <SelectItem value="a1c-low">Lowest A1C</SelectItem>
            <SelectItem value="name">Name</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Results Count & Clear */}
      <div className="flex items-center gap-3 ml-auto">
        <Badge className="bg-blue-100 text-blue-800 border-blue-100">
          {totalRuns} results
        </Badge>
        {hasActiveFilters && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={clearFilters}
            className="text-xs"
          >
            Clear Filters
          </Button>
        )}
      </div>
    </div>
  );
}
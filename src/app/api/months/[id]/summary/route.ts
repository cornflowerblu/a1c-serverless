import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createServerSupabaseClient } from '@/app/lib/client';
import { aggregateMonthData, generateMonthSummary } from '@/utils/month-aggregation';
import type { Month, Run, GlucoseReading } from '@/types/glucose';

/**
 * GET /api/months/:id/summary
 * Retrieves summary statistics for a specific month
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId: clerkId } = await auth();
    
    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const supabase = createServerSupabaseClient();
    
    // First get the internal user ID from clerk_id
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('clerk_id', clerkId)
      .single();
    
    if (userError) {
      console.error('Error fetching user:', userError);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    const userId = userData.id;
    const monthId = params.id;
    
    // Get month
    const { data: monthData, error: monthError } = await supabase
      .from('months')
      .select('*')
      .eq('id', monthId)
      .eq('user_id', userId)
      .single();
    
    if (monthError || !monthData) {
      console.error('Error fetching month:', monthError);
      return NextResponse.json({ error: 'Month not found' }, { status: 404 });
    }
    
    // Transform from database format to API format
    const month: Month = {
      id: monthData.id,
      userId: monthData.user_id,
      name: monthData.name,
      startDate: new Date(monthData.start_date),
      endDate: new Date(monthData.end_date),
      calculatedA1C: monthData.calculated_a1c,
      averageGlucose: monthData.average_glucose,
      runIds: monthData.run_ids || [],
      createdAt: new Date(monthData.created_at),
      updatedAt: new Date(monthData.updated_at)
    };
    
    // Get runs for this month
    const { data: runsData, error: runsError } = await supabase
      .from('runs')
      .select('*')
      .eq('month_id', monthId)
      .eq('user_id', userId);
    
    if (runsError) {
      console.error('Error fetching runs:', runsError);
      return NextResponse.json({ error: 'Failed to fetch runs' }, { status: 500 });
    }
    
    // Transform runs from database format to API format
    const runs: Run[] = runsData.map(run => ({
      id: run.id,
      userId: run.user_id,
      name: run.name,
      startDate: new Date(run.start_date),
      endDate: new Date(run.end_date),
      calculatedA1C: run.calculated_a1c,
      averageGlucose: run.average_glucose,
      monthId: run.month_id,
      createdAt: new Date(run.created_at),
      updatedAt: new Date(run.updated_at)
    }));
    
    // Get all run IDs
    const runIds = runs.map(run => run.id);
    
    // Get readings for these runs
    const { data: readingsData, error: readingsError } = await supabase
      .from('glucose_readings')
      .select('*')
      .in('run_id', runIds.length > 0 ? runIds : ['none']);
    
    if (readingsError) {
      console.error('Error fetching readings:', readingsError);
      return NextResponse.json({ error: 'Failed to fetch readings' }, { status: 500 });
    }
    
    // Transform readings from database format to API format
    const readings: GlucoseReading[] = readingsData.map(reading => ({
      id: reading.id,
      userId: reading.user_id,
      value: reading.value,
      timestamp: new Date(reading.timestamp),
      mealContext: reading.meal_context,
      notes: reading.notes,
      runId: reading.run_id,
      createdAt: new Date(reading.created_at),
      updatedAt: new Date(reading.updated_at)
    }));
    
    // Generate month summary
    const monthSummary = generateMonthSummary(month, runs, readings);
    
    // Get aggregated data for additional statistics
    const aggregatedData = aggregateMonthData(month, runs, readings);
    
    // Combine summary and aggregated data
    const summary = {
      ...monthSummary,
      totalReadings: aggregatedData.totalReadings,
      highReadings: aggregatedData.highReadings,
      lowReadings: aggregatedData.lowReadings,
      inRangeReadings: aggregatedData.inRangeReadings,
      highestReading: aggregatedData.highestReading,
      lowestReading: aggregatedData.lowestReading,
      mostCommonTime: aggregatedData.mostCommonTime
    };
    
    return NextResponse.json({ summary });
  } catch (error) {
    console.error('Error in GET /api/months/:id/summary:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
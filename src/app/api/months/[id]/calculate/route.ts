import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import { createClient } from '../../../../../supabase/client';
import { calculateMonthStatistics } from '../../../../../utils/month-management';
import type { Month, Run } from '../../../../../types/glucose';

/**
 * POST /api/months/:id/calculate
 * Calculates A1C and average glucose for a month
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const monthId = params.id;
    const supabase = createClient();
    
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
    
    // Get calculation options from request body
    const body = await request.json();
    const { useWeightedAverage = false } = body;
    
    // Calculate month statistics
    const updatedMonth = calculateMonthStatistics(month, runs, useWeightedAverage);
    
    // Update month in database
    const { data: updatedData, error: updateError } = await supabase
      .from('months')
      .update({
        calculated_a1c: updatedMonth.calculatedA1C,
        average_glucose: updatedMonth.averageGlucose,
        updated_at: updatedMonth.updatedAt
      })
      .eq('id', monthId)
      .select()
      .single();
    
    if (updateError) {
      console.error('Error updating month:', updateError);
      return NextResponse.json({ error: 'Failed to update month' }, { status: 500 });
    }
    
    // Transform from database format to API format
    const result = {
      id: updatedData.id,
      userId: updatedData.user_id,
      name: updatedData.name,
      startDate: updatedData.start_date,
      endDate: updatedData.end_date,
      calculatedA1C: updatedData.calculated_a1c,
      averageGlucose: updatedData.average_glucose,
      runIds: updatedData.run_ids || [],
      createdAt: updatedData.created_at,
      updatedAt: updatedData.updated_at
    };
    
    return NextResponse.json({ month: result });
  } catch (error) {
    console.error('Error in POST /api/months/:id/calculate:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createServerSupabaseClient } from '@/app/lib/client';
import { calculateMonthStatistics } from '../../../../../utils/month-management';
import type { Month, Run } from '../../../../../types/glucose';

// Configure this route to use Edge Runtime
export const runtime = 'edge';

/**
 * PUT /api/months/:id/calculate
 * Calculates A1C and average glucose for a month and updates the record
 */
export async function PUT(
  request: NextRequest,
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
      createdAt: new Date(monthData.created_at as string),
      updatedAt: new Date(monthData.updated_at as string),
      runIds: [] // Initialize with empty array as run_ids doesn't exist in the database schema
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
      createdAt: new Date(run.created_at as unknown as Date),
      updatedAt: new Date(run.updated_at as unknown as Date)
    }));
    
    // Populate the runIds array with the IDs from the fetched runs
    month.runIds = runs.map(run => run.id);
    
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
        updated_at: updatedMonth.updatedAt as any
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
      runIds: runs.map(run => run.id), // Use the run IDs we collected earlier
      createdAt: updatedData.created_at,
      updatedAt: updatedData.updated_at
    };
    
    return NextResponse.json({ month: result });
  } catch (error) {
    console.error('Error in PUT /api/months/:id/calculate:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createServerSupabaseClient } from '@/app/lib/client';
import { addReadingToRun } from '@/utils/run-management';
import { validateGlucoseReading } from '@/utils/glucose-validation';
import type { MealContext } from '@/types/glucose';

/**
 * POST /api/runs/readings
 * Associates an existing reading with a run
 */
export async function POST(request: NextRequest) {
  try {
    const { userId: clerkId } = await auth();
    
    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServerSupabaseClient();
    
    // First get the user ID from clerk_id
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('clerk_id', clerkId)
      .single();
    
    if (userError) {
      console.error('Error fetching user:', userError);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    const body = await request.json();
    const { readingId, runId } = body;
    
    if (!readingId || !runId) {
      return NextResponse.json({ error: 'Reading ID and Run ID are required' }, { status: 400 });
    }
    
    // Get the reading
    const { data: reading, error: readingError } = await supabase
      .from('glucose_readings')
      .select('*')
      .eq('id', readingId)
      .single();
    
    if (readingError) {
      console.error('Error fetching reading:', readingError);
      return NextResponse.json({ error: 'Reading not found' }, { status: 404 });
    }
    
    // Get the run
    const { data: run, error: runError } = await supabase
      .from('runs')
      .select('*')
      .eq('id', runId)
      .single();
    
    if (runError) {
      console.error('Error fetching run:', runError);
      return NextResponse.json({ error: 'Run not found' }, { status: 404 });
    }
    
    // Check if user owns both the reading and the run
    if (reading.user_id !== userData.id || run.user_id !== userData.id) {
      return NextResponse.json({ error: 'Not authorized to associate this reading with this run' }, { status: 403 });
    }
    
    // Convert database objects to domain objects
    const readingObj = {
      id: reading.id,
      userId: reading.user_id,
      value: reading.value,
      timestamp: new Date(reading.timestamp),
      mealContext: reading.meal_context as MealContext,
      notes: reading.notes as unknown as string,
      runId: reading.run_id as unknown as string,
      createdAt: new Date(reading.created_at as unknown as Date),
      updatedAt: new Date(reading.updated_at as unknown as Date)
    };
    
    const runObj = {
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
    };
    
    try {
      // Use the utility function to associate the reading with the run
      const updatedReading = addReadingToRun(readingObj, runObj);
      
      // Update the reading in the database
      const { data: updatedData, error: updateError } = await supabase
        .from('glucose_readings')
        .update({
          run_id: updatedReading.runId,
          updated_at: new Date().toISOString()
        })
        .eq('id', readingId)
        .select()
        .single();
      
      if (updateError) {
        console.error('Error updating reading:', updateError);
        return NextResponse.json({ error: 'Failed to update reading' }, { status: 500 });
      }
      
      // Transform from database format to API format
      const response = {
        id: updatedData.id,
        userId: updatedData.user_id,
        value: updatedData.value,
        timestamp: updatedData.timestamp,
        mealContext: updatedData.meal_context,
        notes: updatedData.notes,
        runId: updatedData.run_id,
        createdAt: updatedData.created_at,
        updatedAt: updatedData.updated_at
      };
      
      return NextResponse.json({ reading: response });
    } catch (validationError) {
      // Handle validation errors from addReadingToRun
      return NextResponse.json({ 
        error: (validationError as Error).message || 'Invalid reading or run data' 
      }, { status: 400 });
    }
  } catch (error) {
    console.error('Error in POST /api/runs/readings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
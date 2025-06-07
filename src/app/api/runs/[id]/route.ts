import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createServerSupabaseClient } from '@/app/lib/client';
import { calculateRunStatistics } from '@/utils/run-management';
import type { GlucoseReading, Run, MealContext } from '@/types/glucose';
import type { Database } from '@/types/supabase';

// Request body type for PUT
interface UpdateRunBody {
  name?: string;
  startDate?: string;
  endDate?: string;
  monthId?: string | null;
  recalculate?: boolean;
}

/**
 * GET /api/runs/[id]
 * Retrieves a specific run by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId: clerkId } = await auth();
    
    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServerSupabaseClient();
    const runId = params.id;
    
    // First get the user ID from clerk_id
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, user_role')
      .eq('clerk_id', clerkId)
      .single();
    
    if (userError) {
      console.error('Error fetching user:', userError);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
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
    
    // Check if user has access to this run
    if (run.user_id !== userData.id) {
      // If user is not the owner, check if they are a caregiver with access
      if (userData.user_role !== 'caregiver') {
        return NextResponse.json({ error: 'Not authorized to access this run' }, { status: 403 });
      }
      
      // Check if caregiver has access to the run's user
      const { data: connection, error: connectionError } = await supabase
        .from('user_connections')
        .select('*')
        .eq('caregiver_id', userData.id)
        .eq('user_id', run.user_id)
        .maybeSingle();
      
      if (connectionError || !connection) {
        return NextResponse.json({ error: 'Not authorized to access this run' }, { status: 403 });
      }
    }
    
    // Get readings for this run
    const { data: readings, error: readingsError } = await supabase
      .from('glucose_readings')
      .select('*')
      .eq('run_id', runId);
    
    if (readingsError) {
      console.error('Error fetching readings:', readingsError);
      return NextResponse.json({ error: 'Failed to fetch readings' }, { status: 500 });
    }
    
    // Transform database format to API format
    const runData: Run = {
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
    
    const readingsData: GlucoseReading[] = readings.map(r => ({
      id: r.id,
      userId: r.user_id,
      value: r.value,
      timestamp: new Date(r.timestamp),
      mealContext: r.meal_context as MealContext,
      notes: r.notes || undefined,
      runId: r.run_id,
      createdAt: new Date(r.created_at as unknown as Date),
      updatedAt: new Date(r.updated_at as unknown as Date)
    })) as any;
    
    // Format for API response
    const response = {
      id: runData.id,
      userId: runData.userId,
      name: runData.name,
      startDate: runData.startDate.toISOString(),
      endDate: runData.endDate.toISOString(),
      calculatedA1C: runData.calculatedA1C,
      averageGlucose: runData.averageGlucose,
      monthId: runData.monthId,
      createdAt: runData.createdAt.toISOString(),
      updatedAt: runData.updatedAt.toISOString(),
      readings: readingsData.map(r => ({
        id: r.id,
        userId: r.userId,
        value: r.value,
        timestamp: r.timestamp.toISOString(),
        mealContext: r.mealContext,
        notes: r.notes,
        runId: r.runId,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString()
      }))
    };
    
    return NextResponse.json({ run: response });
  } catch (error) {
    console.error('Error in GET /api/runs/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/runs/[id]
 * Updates a run by ID
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
    const runId = params.id;
    
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
    
    // Check if user owns this run
    if (run.user_id !== userData.id) {
      return NextResponse.json({ error: 'Not authorized to update this run' }, { status: 403 });
    }
    
    const body = await request.json() as UpdateRunBody;
    const { name, startDate, endDate, monthId, recalculate } = body;
    
    // Prepare update data
    const updateData: Database['public']['Tables']['runs']['Update'] = {
      updated_at: new Date().toISOString()
    };
    
    if (name !== undefined) updateData.name = name;
    if (startDate !== undefined) updateData.start_date = startDate;
    if (endDate !== undefined) updateData.end_date = endDate;
    if (monthId !== undefined) updateData.month_id = monthId;
    
    // If dates are being updated, validate them
    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      return NextResponse.json({ 
        error: 'End date cannot be before start date' 
      }, { status: 400 });
    }
    
    // If recalculate flag is set, recalculate statistics
    if (recalculate) {
      // Get readings for this run
      const { data: readings, error: readingsError } = await supabase
        .from('glucose_readings')
        .select('*')
        .eq('run_id', runId);
      
      if (readingsError) {
        console.error('Error fetching readings:', readingsError);
        return NextResponse.json({ error: 'Failed to fetch readings' }, { status: 500 });
      }
      
      // Transform to domain objects
      const runData: Run = {
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
      
      const readingsData: GlucoseReading[] = readings.map(r => ({
        id: r.id,
        userId: r.user_id,
        value: r.value,
        timestamp: new Date(r.timestamp),
        mealContext: r.meal_context as MealContext,
        notes: r.notes || undefined,
        runId: r.run_id,
        createdAt: new Date(r.created_at as unknown as Date),
        updatedAt: new Date(r.updated_at as unknown as Date)
      })) as any;
      
      // Calculate statistics
      const updatedRun = calculateRunStatistics(runData, readingsData);
      
      // Add calculated values to update data
      updateData.calculated_a1c = updatedRun.calculatedA1C;
      updateData.average_glucose = updatedRun.averageGlucose;
    }
    
    // Update the run
    const { data: updatedRun, error: updateError } = await supabase
      .from('runs')
      .update(updateData)
      .eq('id', runId)
      .select()
      .single();
    
    if (updateError) {
      console.error('Error updating run:', updateError);
      return NextResponse.json({ error: 'Failed to update run' }, { status: 500 });
    }
    
    // Transform from database format to API format
    const response = {
      id: updatedRun.id,
      userId: updatedRun.user_id,
      name: updatedRun.name,
      startDate: updatedRun.start_date,
      endDate: updatedRun.end_date,
      calculatedA1C: updatedRun.calculated_a1c,
      averageGlucose: updatedRun.average_glucose,
      monthId: updatedRun.month_id,
      createdAt: updatedRun.created_at,
      updatedAt: updatedRun.updated_at
    };
    
    return NextResponse.json({ run: response });
  } catch (error) {
    console.error('Error in PUT /api/runs/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/runs/[id]
 * Deletes a run by ID
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId: clerkId } = await auth();
    
    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServerSupabaseClient();
    const runId = params.id;
    
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
    
    // Get the run
    const { data: run, error: runError } = await supabase
      .from('runs')
      .select('user_id')
      .eq('id', runId)
      .single();
    
    if (runError) {
      console.error('Error fetching run:', runError);
      return NextResponse.json({ error: 'Run not found' }, { status: 404 });
    }
    
    // Check if user owns this run
    if (run.user_id !== userData.id) {
      return NextResponse.json({ error: 'Not authorized to delete this run' }, { status: 403 });
    }
    
    // Delete the run
    const { error: deleteError } = await supabase
      .from('runs')
      .delete()
      .eq('id', runId);
    
    if (deleteError) {
      console.error('Error deleting run:', deleteError);
      return NextResponse.json({ error: 'Failed to delete run' }, { status: 500 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/runs/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
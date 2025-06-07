import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createServerSupabaseClient } from '@/app/lib/client';
import { createRun } from '@/utils/run-management';
import type { Run } from '@/types/glucose';

/**
 * GET /api/runs
 * Retrieves all runs for the authenticated user
 * If the user is a caregiver, also retrieves runs for connected users
 */
export async function GET(request: NextRequest) {
  try {
    const { userId: clerkId } = await auth();
    
    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServerSupabaseClient();
    
    // First get the user ID and role from clerk_id
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, user_role')
      .eq('clerk_id', clerkId)
      .single();
    
    if (userError) {
      console.error('Error fetching user:', userError);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Check if a specific user ID is requested (for caregivers viewing a specific user)
    const url = new URL(request.url);
    const targetUserId = url.searchParams.get('userId');
    
    let userIds = [userData.id]; // Default to own user ID
    
    // If user is a caregiver, get connected users
    if (userData.user_role === 'caregiver') {
      if (targetUserId) {
        // Check if caregiver has access to this specific user
        const { data: connectionData, error: connectionError } = await supabase
          .from('user_connections')
          .select('user_id')
          .eq('caregiver_id', userData.id)
          .eq('user_id', targetUserId)
          .maybeSingle();
          
        if (connectionError) {
          console.error('Error checking connection:', connectionError);
          return NextResponse.json({ error: 'Failed to verify connection' }, { status: 500 });
        }
        
        if (connectionData) {
          userIds = [targetUserId]; // Only show the requested user's runs
        } else {
          return NextResponse.json({ error: 'Not authorized to view this user\'s runs' }, { status: 403 });
        }
      } else {
        // Get all connected users
        const { data: connections, error: connectionsError } = await supabase
          .from('user_connections')
          .select('user_id')
          .eq('caregiver_id', userData.id)
          .select();
          
        if (connectionsError) {
          console.error('Error fetching connections:', connectionsError);
        } else if (connections && connections.length > 0) {
          // Add connected user IDs to the list
          const connectedUserIds = connections.map(conn => conn.user_id);
          userIds = [...userIds, ...connectedUserIds];
        }
      }
    }
    
    // Then get the runs for all applicable user IDs
    const { data, error } = await supabase
      .from('runs')
      .select(`
        id,
        user_id,
        name,
        start_date,
        end_date,
        calculated_a1c,
        average_glucose,
        month_id,
        created_at,
        updated_at
      `)      
      .in('user_id', userIds)
      .order('start_date', { ascending: false });
    
    if (error) {
      console.error('Error fetching runs:', error);
      return NextResponse.json({ error: 'Failed to fetch runs' }, { status: 500 });
    }
    
    // Transform from database format to API format
    const runs = data.map(run => ({
      id: run.id,
      userId: run.user_id,
      name: run.name,
      startDate: run.start_date,
      endDate: run.end_date,
      calculatedA1C: run.calculated_a1c,
      averageGlucose: run.average_glucose,
      monthId: run.month_id,
      createdAt: run.created_at,
      updatedAt: run.updated_at
    }));
    
    return NextResponse.json({ runs });
  } catch (error) {
    console.error('Error in GET /api/runs:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/runs
 * Creates a new run for the authenticated user
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
    const { name, startDate, endDate, monthId } = body;
    
    try {
      // Create run using the utility function
      const startDateObj = startDate ? new Date(startDate) : new Date();
      const endDateObj = endDate ? new Date(endDate) : new Date();
      
      const run = createRun(userData.id, name, startDateObj, endDateObj);
      
      // Insert into database
      const { data, error } = await supabase
        .from('runs')
        .insert({
          id: run.id,
          user_id: run.userId,
          name: run.name,
          start_date: run.startDate.toISOString(),
          end_date: run.endDate.toISOString(),
          calculated_a1c: run.calculatedA1C,
          average_glucose: run.averageGlucose,
          month_id: monthId || null,
          created_at: run.createdAt.toISOString(),
          updated_at: run.updatedAt.toISOString()
        })
        .select()
        .single();
      
      if (error) {
        console.error('Error creating run:', error);
        return NextResponse.json({ error: 'Failed to create run' }, { status: 500 });
      }
      
      // Transform from database format to API format
      const createdRun = {
        id: data.id,
        userId: data.user_id,
        name: data.name,
        startDate: data.start_date,
        endDate: data.end_date,
        calculatedA1C: data.calculated_a1c,
        averageGlucose: data.average_glucose,
        monthId: data.month_id,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };
      
      return NextResponse.json({ run: createdRun }, { status: 201 });
    } catch (validationError) {
      // Handle validation errors from createRun
      return NextResponse.json({ 
        error: (validationError as Error).message || 'Invalid run data' 
      }, { status: 400 });
    }
  } catch (error) {
    console.error('Error in POST /api/runs:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
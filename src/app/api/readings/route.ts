/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createServerSupabaseClient } from '@/app/lib/client';
import { validateGlucoseReading } from '@/utils/glucose-validation';
import type { MealContext } from '@/types/glucose';
// import type { Json } from '@/types/supabase';

/**
 * GET /api/readings
 * Retrieves all glucose readings for the authenticated user
 * If the user is a caregiver, also retrieves readings for connected users
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
          userIds = [targetUserId]; // Only show the requested user's readings
        } else {
          return NextResponse.json({ error: 'Not authorized to view this user\'s readings' }, { status: 403 });
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
    
    // Then get the glucose readings for all applicable user IDs
    const { data, error } = await supabase
      .from('glucose_readings')
      .select(`
        id,
        user_id,
        value,
        timestamp,
        meal_context,
        notes,
        run_id,
        created_at,
        updated_at,
        users!inner(name, email)
      `)      
      .in('user_id', userIds)
      .order('timestamp', { ascending: false });
    
    if (error) {
      console.error('Error fetching readings:', error);
      return NextResponse.json({ error: 'Failed to fetch readings' }, { status: 500 });
    }
    
    // Transform from database format to API format
const readings = data.map(reading => ({
  id: reading.id,
  userId: reading.user_id,
  userName: reading.users?.name || reading.users?.email,
  value: reading.value,
  timestamp: reading.timestamp,
  mealContext: reading.meal_context as MealContext,
  notes: reading.notes,
  runId: reading.run_id,
  createdAt: reading.created_at,
  updatedAt: reading.updated_at
}));


    
    return NextResponse.json({ readings });
  } catch (error) {
    console.error('Error in GET /api/readings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/readings
 * Creates a new glucose reading for the authenticated user
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
    const { value, timestamp, mealContext, notes, runId } = body;
    
    // Create reading object with required fields for validation
    const readingForValidation = {
      id: 'temp-id', // Temporary ID for validation
      userId: userData.id,
      value: Number(value),
      timestamp: new Date(timestamp),
      mealContext: mealContext as MealContext,
      notes,
      runId,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // Validate the reading
    if (!validateGlucoseReading(readingForValidation)) {
      return NextResponse.json({ error: 'Invalid glucose reading' }, { status: 400 });
    }
    
    // Insert into database
    const { data, error } = await supabase
      .from('glucose_readings')
      .insert({
        user_id: userData.id,
        value: Number(value),
        timestamp: timestamp, // Use the timestamp string directly
        meal_context: mealContext,
        notes,
        run_id: runId
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating reading:', error);
      return NextResponse.json({ error: 'Failed to create reading' }, { status: 500 });
    }
    
    // Transform from database format to API format
    const createdReading = {
      id: data.id,
      userId: data.user_id,
      value: data.value,
      timestamp: data.timestamp,
      mealContext: data.meal_context as MealContext,
      notes: data.notes,
      runId: data.run_id,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
    
    return NextResponse.json({ reading: createdReading }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/readings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

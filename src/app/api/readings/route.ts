/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createServerSupabaseClient } from '@/app/lib/client';
import { validateGlucoseReading } from '@/utils/glucose-validation';
import type { MealContext } from '@/types/glucose';

/**
 * GET /api/readings
 * Retrieves all glucose readings for the authenticated user
 */
export async function GET(_request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const supabase = createServerSupabaseClient();
    
    const { data, error } = await supabase
      .from('glucose_readings')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false });
    
    if (error) {
      console.error('Error fetching readings:', error);
      return NextResponse.json({ error: 'Failed to fetch readings' }, { status: 500 });
    }
    
    // Transform from database format to API format
    const readings = data.map(reading => ({
      id: reading.id,
      userId: reading.user_id,
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
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServerSupabaseClient();
    
    const body = await request.json();
    const { value, timestamp, mealContext, notes, runId } = body;
    
    // Create reading object with required fields for validation
    const readingForValidation = {
      id: 'temp-id', // Temporary ID for validation
      userId,
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
        user_id: userId,
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

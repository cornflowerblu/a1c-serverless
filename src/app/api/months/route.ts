/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createServerSupabaseClient } from '@/app/lib/client';
import { createMonth } from '@/utils/month-management';

// Configure this route to use Edge Runtime
export const runtime = 'edge';

/**
 * GET /api/months
 * Retrieves all months for the authenticated user
 */
export async function GET(_request: NextRequest) {
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
    
    const { data, error } = await supabase
      .from('months')
      .select('*')
      .eq('user_id', userId)
      .order('start_date', { ascending: false });
    
    if (error) {
      console.error('Error fetching months:', error);
      return NextResponse.json({ error: 'Failed to fetch months' }, { status: 500 });
    }
    
    // Transform from database format to API format
    const months = data.map(month => ({
      id: month.id,
      userId: month.user_id,
      name: month.name,
      startDate: month.start_date,
      endDate: month.end_date,
      calculatedA1C: month.calculated_a1c,
      averageGlucose: month.average_glucose,
      createdAt: month.created_at,
      updatedAt: month.updated_at
    }));
    
    return NextResponse.json({ months });
  } catch (error) {
    console.error('Error in GET /api/months:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/months
 * Creates a new month for the authenticated user
 */
export async function POST(request: NextRequest) {
  try {
    const { userId: clerkId } = await auth();
    
    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const supabasePost = createServerSupabaseClient();
    
    // First get the internal user ID from clerk_id
    const { data: userData, error: userError } = await supabasePost
      .from('users')
      .select('id')
      .eq('clerk_id', clerkId)
      .single();
    
    if (userError) {
      console.error('Error fetching user:', userError);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    const userId = userData.id;
    
    const body = await request.json();
    const { name, startDate, endDate } = body;
    
    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (end < start) {
      return NextResponse.json({ error: 'End date cannot be before start date' }, { status: 400 });
    }
    
    // Create month object
    const month = createMonth(userId, name, start, end);
    
    const supabase = createServerSupabaseClient();
    
    // Insert into database
    const { data, error } = await supabase
      .from('months')
      .insert({
        //@ts-ignore
        id: month.id,
        user_id: month.userId,
        name: month.name,
        start_date: month.startDate,
        end_date: month.endDate,
        calculated_a1c: month.calculatedA1C,
        average_glucose: month.averageGlucose,
        run_ids: month.runIds,
        created_at: month.createdAt,
        updated_at: month.updatedAt
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating month:', error);
      return NextResponse.json({ error: 'Failed to create month' }, { status: 500 });
    }
    
    // Transform from database format to API format
    const createdMonth = {
      id: data.id,
      userId: data.user_id,
      name: data.name,
      startDate: data.start_date,
      endDate: data.end_date,
      calculatedA1C: data.calculated_a1c,
      averageGlucose: data.average_glucose,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
    
    return NextResponse.json({ month: createdMonth }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/months:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
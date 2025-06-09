import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createServerSupabaseClient } from '@/app/lib/client';
import { calculateA1C, calculateAverageGlucose } from '@/utils/a1c-calculator';

// Configure this route to use Edge Runtime
export const runtime = 'edge';

/**
 * POST /api/estimate
 * Calculates real-time A1C estimate based on provided glucose readings
 * Optimized for edge execution with minimal latency
 */
export async function POST(request: NextRequest) {
  try {
    const { userId: clerkId } = await auth();
    
    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get readings data from request body
    const { readings } = await request.json();
    
    if (!Array.isArray(readings) || readings.length === 0) {
      return NextResponse.json({ error: 'Invalid readings data' }, { status: 400 });
    }
    
    // Calculate average glucose from readings
    const averageGlucose = calculateAverageGlucose(readings);
    
    // Calculate A1C estimate using the utility function
    const a1cEstimate = calculateA1C(averageGlucose);
    
    return NextResponse.json({
      a1cEstimate,
      averageGlucose,
      readingsCount: readings.length
    });
  } catch (error) {
    console.error('Error in POST /api/estimate:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * GET /api/estimate
 * Retrieves readings for the authenticated user and calculates A1C estimate
 */
export async function GET(request: NextRequest) {
  try {
    const { userId: clerkId } = await auth();
    
    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServerSupabaseClient();
    
    // Get the user ID from clerk_id
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('clerk_id', clerkId)
      .single();
    
    if (userError) {
      console.error('Error fetching user:', userError);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Get date range from query parameters
    const url = new URL(request.url);
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');
    
    // Build query for glucose readings
    let query = supabase
      .from('glucose_readings')
      .select('value, timestamp')
      .eq('user_id', userData.id);
    
    // Add date filters if provided
    if (startDate) {
      query = query.gte('timestamp', startDate);
    }
    
    if (endDate) {
      query = query.lte('timestamp', endDate);
    }
    
    // Execute query
    const { data: readings, error: readingsError } = await query;
    
    if (readingsError) {
      console.error('Error fetching readings:', readingsError);
      return NextResponse.json({ error: 'Failed to fetch readings' }, { status: 500 });
    }
    
    if (!readings || readings.length === 0) {
      return NextResponse.json({ 
        a1cEstimate: null, 
        averageGlucose: null,
        readingsCount: 0,
        message: 'No readings found for the specified period'
      });
    }
    
    // Calculate average glucose from readings
    const averageGlucose = calculateAverageGlucose(readings);
    
    // Calculate A1C estimate using the utility function
    const a1cEstimate = calculateA1C(averageGlucose);
    
    return NextResponse.json({
      a1cEstimate,
      averageGlucose,
      readingsCount: readings.length,
      period: {
        startDate: startDate || 'all time',
        endDate: endDate || 'present'
      }
    });
  } catch (error) {
    console.error('Error in GET /api/estimate:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
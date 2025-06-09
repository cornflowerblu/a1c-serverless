import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createServerSupabaseClient } from '@/app/lib/client';

// Configure this route to use Edge Runtime
export const runtime = 'edge';

/**
 * GET /api/summary
 * Provides a summary of user's glucose data and A1C estimates
 * Optimized for edge execution with minimal latency
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
      .select('id, user_role')
      .eq('clerk_id', clerkId)
      .single();
    
    if (userError) {
      console.error('Error fetching user:', userError);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Check if a specific user ID is requested (for caregivers)
    const url = new URL(request.url);
    const targetUserId = url.searchParams.get('userId');
    
    let userId = userData.id;
    
    // If user is a caregiver and a target user is specified, verify access
    if (userData.user_role === 'caregiver' && targetUserId) {
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
        userId = targetUserId;
      } else {
        return NextResponse.json({ error: 'Not authorized to view this user\'s data' }, { status: 403 });
      }
    }
    
    // Get the latest month data
    const { data: latestMonth, error: monthError } = await supabase
      .from('months')
      .select('id, month, year, a1c_estimate, average_glucose')
      .eq('user_id', userId)
      .order('year', { ascending: false })
      .order('month', { ascending: false })
      .limit(1)
      .single();
    
    if (monthError && monthError.code !== 'PGRST116') { // PGRST116 is "no rows returned"
      console.error('Error fetching latest month:', monthError);
      return NextResponse.json({ error: 'Failed to fetch month data' }, { status: 500 });
    }
    
    // Get recent readings count
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const { count: recentReadingsCount, error: countError } = await supabase
      .from('glucose_readings')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('timestamp', thirtyDaysAgo.toISOString());
    
    if (countError) {
      console.error('Error counting recent readings:', countError);
      return NextResponse.json({ error: 'Failed to count readings' }, { status: 500 });
    }
    
    // Get total runs count
    const { count: runsCount, error: runsError } = await supabase
      .from('runs')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);
    
    if (runsError) {
      console.error('Error counting runs:', runsError);
      return NextResponse.json({ error: 'Failed to count runs' }, { status: 500 });
    }
    
    // Construct the summary response
    const summary = {
      userId,
      latestMonth: latestMonth ? {
        id: latestMonth.id,
        month: latestMonth.month,
        year: latestMonth.year,
        a1cEstimate: latestMonth.a1c_estimate,
        averageGlucose: latestMonth.average_glucose
      } : null,
      recentReadingsCount: recentReadingsCount || 0,
      totalRunsCount: runsCount || 0
    };
    
    return NextResponse.json({ summary });
  } catch (error) {
    console.error('Error in GET /api/summary:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
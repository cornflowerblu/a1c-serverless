/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import { PUT, DELETE } from '../route';

/**
 * GET /api/months/:id
 * Retrieves a specific month by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId, getToken } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const monthId = params.id;
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${await getToken({ template: 'supabase' })}`,
          },
        },
      }
    );
    
    // Get month
    const { data, error } = await supabase
      .from('months')
      .select('*, runs(*)')
      .eq('id', monthId)
      .eq('user_id', userId)
      .single();
    
    if (error || !data) {
      console.error('Error fetching month:', error);
      return NextResponse.json({ error: 'Month not found' }, { status: 404 });
    }
    
    // Transform from database format to API format
    const month = {
      id: data.id,
      userId: data.user_id,
      name: data.name,
      startDate: data.start_date,
      endDate: data.end_date,
      calculatedA1C: data.calculated_a1c,
      averageGlucose: data.average_glucose,
      runIds: data.run_ids || [],
      runs: data.runs ? data.runs.map((run: any) => ({
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
      })) : [],
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
    
    return NextResponse.json({ month });
  } catch (error) {
    console.error('Error in GET /api/months/:id:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Re-export PUT and DELETE from the parent route
export { PUT, DELETE };

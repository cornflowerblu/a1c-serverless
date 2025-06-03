import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import { createMonth } from '@/utils/month-management';
import { Database } from '@/types/supabase';

/**
 * GET /api/months
 * Retrieves all months for the authenticated user
 */
export async function GET(_request: NextRequest) {
  try {
    const { userId, getToken } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const supabase = createClient<Database>(
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
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
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
    
    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${await (await auth()).getToken({ template: 'supabase' })}`,
          },
        },
      }
    );
    
    // Insert into database
    const { data, error } = await supabase
      .from('months')
      .insert({
        user_id: month.userId,
        name: month.name,
        start_date: month.startDate.toISOString(),
        end_date: month.endDate.toISOString(),
        calculated_a1c: month.calculatedA1C,
        average_glucose: month.averageGlucose
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

/**
 * PUT /api/months/:id
 * Updates an existing month
 */
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { userId, getToken } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const monthId = params.id;
    const body = await request.json();
    const { name, startDate, endDate } = body;
    
    const supabase = createClient<Database>(
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
    
    // Check if month exists and belongs to user
    const { data: existingMonth, error: fetchError } = await supabase
      .from('months')
      .select('*')
      .eq('id', monthId)
      .eq('user_id', userId)
      .single();
    
    if (fetchError || !existingMonth) {
      return NextResponse.json({ error: 'Month not found' }, { status: 404 });
    }
    
    // Prepare update data
    const updateData: Record<string, unknown> = {
      updated_at: new Date()
    };
    
    if (name) updateData.name = name;
    
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      if (end < start) {
        return NextResponse.json({ error: 'End date cannot be before start date' }, { status: 400 });
      }
      
      updateData.start_date = start;
      updateData.end_date = end;
    } else if (startDate) {
      const start = new Date(startDate);
      const end = existingMonth.end_date ? new Date(existingMonth.end_date) : new Date();
      
      if (end < start) {
        return NextResponse.json({ error: 'End date cannot be before start date' }, { status: 400 });
      }
      
      updateData.start_date = start;
    } else if (endDate) {
      const end = new Date(endDate);
      const start = existingMonth.start_date ? new Date(existingMonth.start_date) : new Date();
      
      if (end < start) {
        return NextResponse.json({ error: 'End date cannot be before start date' }, { status: 400 });
      }
      
      updateData.end_date = end;
    }
    
    // Update month
    const { data, error } = await supabase
      .from('months')
      .update(updateData)
      .eq('id', monthId)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating month:', error);
      return NextResponse.json({ error: 'Failed to update month' }, { status: 500 });
    }
    
    // Transform from database format to API format
    const updatedMonth = {
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
    
    return NextResponse.json({ month: updatedMonth });
  } catch (error) {
    console.error('Error in PUT /api/months:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/months/:id
 * Deletes a month
 */
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
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
    
    // Check if month exists and belongs to user
    const { data: existingMonth, error: fetchError } = await supabase
      .from('months')
      .select('*')
      .eq('id', monthId)
      .eq('user_id', userId)
      .single();
    
    if (fetchError || !existingMonth) {
      return NextResponse.json({ error: 'Month not found' }, { status: 404 });
    }
    
    // Delete month
    const { error } = await supabase
      .from('months')
      .delete()
      .eq('id', monthId);
    
    if (error) {
      console.error('Error deleting month:', error);
      return NextResponse.json({ error: 'Failed to delete month' }, { status: 500 });
    }
    
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Error in DELETE /api/months:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

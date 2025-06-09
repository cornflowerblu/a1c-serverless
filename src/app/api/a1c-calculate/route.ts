// src/app/api/a1c-calculate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/app/lib/client';

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const { userId, readingId } = await request.json();
    
    if (!userId || !readingId) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }
    
    // Invoke the edge function directly
    const { data, error } = await supabase.functions.invoke('a1c-calculator', {
      body: JSON.stringify({ userId, readingId, batchMode: false })
    });
    
    if (error) {
      console.error('Error invoking edge function:', error);
      return NextResponse.json(
        { error: 'Failed to process A1C calculation' },
        { status: 500 }
      );
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in A1C calculation API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

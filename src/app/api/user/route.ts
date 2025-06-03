import { auth } from '@clerk/nextjs/server';
import { createServerSupabaseClient } from '@/app/lib/client';
import { NextResponse } from 'next/server';

export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    // Create a Supabase client with the Clerk session token
    const supabaseClient = createServerSupabaseClient();

    // Fetch users from Supabase
    const { data: users, error } = await supabaseClient.from('users').select()

    if (error) {
      console.error('Supabase error:', error);
      return new NextResponse('Failed to fetch users', { status: 500 });
    }

    return NextResponse.json({ users });
  } catch (error) {
    console.error('Error fetching users:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

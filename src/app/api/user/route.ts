import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { Database } from '@/types/supabase';

export async function GET() {
  const { userId, getToken } = await auth();

  if (!userId) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    // Create a Supabase client with the Clerk session token
    const supabaseClient = createClient<Database>(
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

    // Fetch users from Supabase
    const { data: users, error } = await supabaseClient.from('users').select();

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

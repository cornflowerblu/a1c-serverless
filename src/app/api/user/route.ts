import { auth } from '@clerk/nextjs/server';
import { createClient } from '@/supabase/client';
import { NextResponse } from 'next/server';

// Configure this route to use Edge Runtime
export const runtime = 'edge';

export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    // Create a Supabase client
    const supabase = createClient();

    // Fetch user with profile from Supabase
    const { data: userData, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.error('Error fetching user:', userError);
      return new NextResponse('Failed to fetch user', { status: 500 });
    }

    // Fetch the user's profile
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userData.user.id)
      .single();
    
    if (profileError && profileError.code !== 'PGRST116') { // PGRST116 is 'not found'
      console.error('Error fetching profile:', profileError);
      return new NextResponse('Failed to fetch profile', { status: 500 });
    }

    // Combine user and profile data
    const user = {
      ...userData.user,
      profile: profileData || undefined
    };

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Error fetching user:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
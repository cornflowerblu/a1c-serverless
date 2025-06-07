import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import MonthForm from '../month-form';
import { createServerSupabaseClient } from '@/app/lib/client';

export default async function CreateMonthPage() {
  const { userId: clerkId } = await auth();
  
  if (!clerkId) {
    redirect('/');
  }
  
  // Get the internal user ID from clerk_id
  const supabase = createServerSupabaseClient();
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('id')
    .eq('clerk_id', clerkId)
    .single();
  
  if (userError) {
    console.error('Error fetching user:', userError);
    return (
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">Create Month</h1>
        <p className="text-red-500">Error loading user data. Please try again later.</p>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Create Month</h1>
      <MonthForm />
    </div>
  );
}
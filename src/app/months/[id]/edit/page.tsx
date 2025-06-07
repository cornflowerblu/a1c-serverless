import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '../../../lib/client';
import MonthForm from '../../month-form';

export default async function EditMonthPage({ params }: { params: { id: string } }) {
  const { userId: clerkId } = await auth();
  
  if (!clerkId) {
    redirect('/');
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
    redirect('/months');
  }
  
  const userId = userData.id;
  
  const { data: month, error } = await supabase
    .from('months')
    .select('*')
    .eq('id', params.id)
    .eq('user_id', userId)
    .single();
  
  if (error || !month) {
    console.error('Error fetching month:', error);
    redirect('/months');
  }
  
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Edit Month</h1>
      <MonthForm
        initialData={{
          id: month.id,
          name: month.name,
          startDate: month.start_date,
          endDate: month.end_date
        }}
      />
    </div>
  );
}

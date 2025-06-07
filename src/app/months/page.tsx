import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createServerSupabaseClient } from '../lib/client';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card';

export default async function MonthsPage() {
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
    return (
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">Months</h1>
        <p className="text-red-500">Error loading user data. Please try again later.</p>
      </div>
    );
  }
  
  const userId = userData.id;
  
  const { data: months, error } = await supabase
    .from('months')
    .select('*, runs!runs_month_id_fkey(*)')
    .eq('user_id', userId)
    .order('start_date', { ascending: false });
  
  if (error) {
    console.error('Error fetching months:', error);
    return (
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">Months</h1>
        <p className="text-red-500">Error loading months. Please try again later.</p>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Months</h1>
        <Link href="/months/create">
          <Button>Create Month</Button>
        </Link>
      </div>
      
      {months && months.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {months.map((month) => (
            <Card key={month.id} className="shadow-md">
              <CardHeader>
                <CardTitle>{month.name}</CardTitle>
                <CardDescription>
                  {new Date(month.start_date).toLocaleDateString()} - {new Date(month.end_date).toLocaleDateString()}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="font-medium">A1C:</span>
                    <span>{month.calculated_a1c ? `${month.calculated_a1c.toFixed(1)}%` : 'Not calculated'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Avg. Glucose:</span>
                    <span>{month.average_glucose ? `${month.average_glucose.toFixed(0)} mg/dL` : 'Not calculated'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Runs:</span>
                    <span>{month.runs ? month.runs.length : 0}</span>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Link href={`/months/${month.id}`}>
                  <Button variant="outline">View Details</Button>
                </Link>
                <Link href={`/months/${month.id}/calculate`}>
                  <Button variant="secondary">Calculate A1C</Button>
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-10">
          <p className="text-gray-500 mb-4">No months found. Create your first month to get started.</p>
          <Link href="/months/create">
            <Button>Create Month</Button>
          </Link>
        </div>
      )}
    </div>
  );
}
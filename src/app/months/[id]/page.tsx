import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createServerSupabaseClient } from '../../lib/client';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import MonthSummary from '../../components/MonthSummary';

export default async function MonthDetailPage({ params }: { params: { id: string } }) {
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
        <h1 className="text-2xl font-bold mb-4">Month Details</h1>
        <p className="text-red-500">Error loading user data. Please try again later.</p>
        <Link href="/months">
          <Button className="mt-4">Back to Months</Button>
        </Link>
      </div>
    );
  }
  
  const userId = userData.id;
  
  const { data: month, error } = await supabase
    .from('months')
    .select('*, runs!runs_month_id_fkey(*)')
    .eq('id', params.id)
    .eq('user_id', userId)
    .single();
  
  if (error || !month) {
    console.error('Error fetching month:', error);
    return (
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">Month Details</h1>
        <p className="text-red-500">Month not found or you don't have permission to view it.</p>
        <Link href="/months">
          <Button className="mt-4">Back to Months</Button>
        </Link>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">{month.name}</h1>
        <div className="space-x-2">
          <Link href={`/months/${month.id}/edit`}>
            <Button variant="outline">Edit</Button>
          </Link>
          <Link href={`/months/${month.id}/calculate`}>
            <Button>Calculate A1C</Button>
          </Link>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Date Range</CardTitle>
          </CardHeader>
          <CardContent>
            <p>
              {new Date(month.start_date).toLocaleDateString()} - {new Date(month.end_date).toLocaleDateString()}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>A1C Estimate</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {month.calculated_a1c ? `${month.calculated_a1c.toFixed(1)}%` : 'Not calculated'}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Average Glucose</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {month.average_glucose ? `${month.average_glucose.toFixed(0)} mg/dL` : 'Not calculated'}
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* Month Summary Component */}
      <div className="mb-8">
        <MonthSummary 
          month={{
            id: month.id,
            name: month.name,
            startDate: month.start_date,
            endDate: month.end_date,
            calculatedA1C: month.calculated_a1c,
            averageGlucose: month.average_glucose
          }} 
        />
      </div>
      
      <h2 className="text-xl font-bold mb-4">Runs in this Month</h2>
      
      {month.runs && month.runs.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {month.runs.map((run) => (
            <Card key={run.id} className="shadow-sm hover:shadow-md transition-shadow duration-200">
              <CardHeader>
                <CardTitle>{run.name}</CardTitle>
                <CardDescription>
                  {new Date(run.start_date).toLocaleDateString()} - {new Date(run.end_date).toLocaleDateString()}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="font-medium">A1C:</span>
                    <span className={run.calculated_a1c ? (run.calculated_a1c > 7 ? 'text-red-600' : 'text-green-600') : ''}>
                      {run.calculated_a1c ? `${run.calculated_a1c.toFixed(1)}%` : 'Not calculated'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Avg. Glucose:</span>
                    <span className={run.average_glucose ? (run.average_glucose > 180 ? 'text-red-600' : 'text-green-600') : ''}>
                      {run.average_glucose ? `${run.average_glucose.toFixed(0)} mg/dL` : 'Not calculated'}
                    </span>
                  </div>
                </div>
                <div className="mt-4">
                  <Link href={`/runs/${run.id}`}>
                    <Button variant="outline" size="sm" className="w-full">View Run</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-10 bg-gray-50 rounded-lg">
          <p className="text-gray-500 mb-4">No runs found in this month.</p>
          <Link href="/runs/create">
            <Button>Create Run</Button>
          </Link>
        </div>
      )}
      
      <div className="mt-8">
        <Link href="/months">
          <Button variant="outline">Back to Months</Button>
        </Link>
      </div>
    </div>
  );
}
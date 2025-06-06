'use client';

import { useRouter } from 'next/navigation';
import { SignedIn, SignedOut } from '@clerk/nextjs';
import { useEffect } from 'react';

export default function HomePage() {
  const router = useRouter();
  
  // Redirect authenticated users to dashboard
  useEffect(() => {
    // This effect will only run on the client side
    const redirectToDashboard = async () => {
      try {
        // Small delay to avoid immediate redirect which can cause flicker
        await new Promise(resolve => setTimeout(resolve, 100));
        router.push('/dashboard');
      } catch (error) {
        console.error('Error redirecting to dashboard:', error);
      }
    };
    
    // We'll let the SignedIn component handle this check
  }, [router]);
  
  return (
    <div className="min-h-screen flex flex-col">
      <SignedIn>
        <div className="flex justify-center items-center p-8">
          <p>Redirecting to dashboard...</p>
        </div>
      </SignedIn>
      
      <SignedOut>
        <div className="flex-1 flex flex-col justify-center max-w-4xl mx-auto px-4 py-16">
          <h1 className="text-4xl font-bold mb-6">Welcome to A1C Estimator</h1>
          <p className="text-xl mb-8">
            Track your glucose readings and estimate your A1C levels over time.
          </p>
          
          <div className="bg-white shadow rounded-lg p-8">
            <h2 className="text-2xl font-semibold mb-4">Get Started</h2>
            <p className="mb-6">
              Sign up or sign in to start tracking your glucose readings and get personalized A1C estimates.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-medium mb-2">Track Readings</h3>
                <p className="text-gray-600 text-sm">
                  Record your glucose readings with meal context and notes.
                </p>
              </div>
              
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-medium mb-2">View Trends</h3>
                <p className="text-gray-600 text-sm">
                  See how your glucose levels change over time with visual charts.
                </p>
              </div>
              
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-medium mb-2">Estimate A1C</h3>
                <p className="text-gray-600 text-sm">
                  Get an estimate of your A1C based on your glucose readings.
                </p>
              </div>
            </div>
          </div>
        </div>
      </SignedOut>
    </div>
  );
}
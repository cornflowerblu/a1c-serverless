'use client';

import { useRouter } from 'next/navigation';
import { SignedIn, SignedOut, useAuth } from '@clerk/nextjs';
import { useEffect } from 'react';
import { LandingHero } from './components/landing-hero';
import { FeatureSection } from './components/feature-section';
import { CTASection } from './components/cta-section';

export default function HomePage() {
  const router = useRouter();
  const { isSignedIn } = useAuth();
  
  useEffect(() => {
    if (isSignedIn) {
      router.push('/dashboard');
    }
  }, [isSignedIn, router]);
  
  return (
    <div className="min-h-screen flex flex-col">
      <SignedIn>
        <div className="flex justify-center items-center p-8">
          <p>Redirecting to dashboard...</p>
        </div>
      </SignedIn>
      
      <SignedOut>
        <LandingHero />
        <FeatureSection />
        <CTASection />
      </SignedOut>
    </div>
  );
}
'use client';

import { SignUpButton } from '@clerk/nextjs';
import Image from 'next/image';

export function LandingHero() {
  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-3xl mx-4 sm:mx-8 lg:mx-auto max-w-7xl mt-8 overflow-hidden">
      <div className="flex flex-col lg:flex-row items-center px-6 py-12 lg:py-16 lg:px-12">
        <div className="lg:w-1/2 lg:pr-12">
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 leading-tight mb-6">
            Track Your Glucose <span className="text-blue-600">Effortlessly</span>
          </h1>
          <p className="text-xl text-gray-700 mb-8 leading-relaxed">
            Monitor your glucose readings and get personalized A1C estimates to better manage your health journey.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <SignUpButton mode="modal">
              <button className="btn-primary">
                Get Started
              </button>
            </SignUpButton>
            <button className="btn-secondary">
              Learn More
            </button>
          </div>
        </div>
        <div className="lg:w-1/2 mt-12 lg:mt-0">
          <div className="relative h-64 sm:h-80 lg:h-96 w-full rounded-xl overflow-hidden shadow-2xl">
            <Image 
              src="/images/dashboard-preview.svg"
              alt="Dashboard Preview"
              fill
              style={{ objectFit: 'cover' }}
              priority
            />
          </div>
        </div>
      </div>
    </div>
  );
}
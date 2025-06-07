'use client';

import { SignUpButton } from '@clerk/nextjs';

export function CTASection() {
  return (
    <div className="bg-gray-50 py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="cta-gradient rounded-3xl overflow-hidden shadow-xl">
          <div className="px-6 py-12 sm:px-12 lg:px-16 text-center sm:text-left">
            <div className="sm:flex items-center">
              <div className="sm:w-2/3">
                <h2 className="text-3xl font-bold text-white mb-4">Ready to take control of your health?</h2>
                <p className="text-blue-100 text-lg mb-8 sm:mb-0">
                  Join thousands of users who are already tracking their glucose levels and improving their health with A1C Estimator.
                </p>
              </div>
              <div className="sm:w-1/3 sm:text-right">
                <SignUpButton mode="modal">
                  <button className="bg-white hover:bg-gray-100 text-blue-600 px-8 py-3 rounded-xl text-lg font-medium transition-colors shadow-lg inline-block">
                    Sign Up Now
                  </button>
                </SignUpButton>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
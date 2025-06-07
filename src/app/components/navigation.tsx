'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SignedIn } from '@clerk/nextjs';

export function Navigation() {
  const pathname = usePathname();
  
  const isActive = (path: string) => {
    return pathname === path || pathname?.startsWith(`${path}/`);
  };
  
  return (
    <SignedIn>
      <nav className="flex items-center space-x-4">
        <Link 
          href="/dashboard" 
          className={`px-3 py-2 rounded-md text-sm font-medium ${
            isActive('/dashboard') 
              ? 'bg-gray-900 text-white' 
              : 'text-gray-300 hover:bg-gray-700 hover:text-white'
          }`}
        >
          Dashboard
        </Link>
        <Link 
          href="/readings" 
          className={`px-3 py-2 rounded-md text-sm font-medium ${
            isActive('/readings') 
              ? 'bg-gray-900 text-white' 
              : 'text-gray-300 hover:bg-gray-700 hover:text-white'
          }`}
        >
          Readings
        </Link>
        <Link 
          href="/runs" 
          className={`px-3 py-2 rounded-md text-sm font-medium ${
            isActive('/runs') 
              ? 'bg-gray-900 text-white' 
              : 'text-gray-300 hover:bg-gray-700 hover:text-white'
          }`}
        >
          Runs
        </Link>
      </nav>
    </SignedIn>
  );
}
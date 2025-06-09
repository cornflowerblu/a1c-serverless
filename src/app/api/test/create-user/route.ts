// src/app/api/test/create-user/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  // Only allow in development/test environments
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }

  try {
    // For testing purposes, we'll create a mock user and generate a test JWT token
    const testUser = {
      id: 'test-user-id',
      email: 'test@example.com',
      first_name: 'Test',
      last_name: 'User'
    };
    
    // Generate a test token that can be used for authentication
    // In a real test environment, you might use a library like jsonwebtoken
    // Here we're just creating a simple encoded string for testing
    const testToken = Buffer.from(JSON.stringify({
      sub: testUser.id,
      email: testUser.email,
      exp: Math.floor(Date.now() / 1000) + 3600 // 1 hour from now
    })).toString('base64');
    
    return NextResponse.json({ 
      user: testUser, 
      token: testToken 
    });
  } catch (error) {
    console.error('Error creating test user:', error);
    return NextResponse.json({ error: 'Failed to create test user' }, { status: 500 });
  }
}

import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { createClient } from './supabase/client';

const isProtectedRoute = createRouteMatcher(['/dashboard(.*)', '/readings(.*)', '/runs(.*)', '/months(.*)']);

export default clerkMiddleware(async (auth, req) => {
  // Check for test authentication header
  const isTestAuth = req.headers.get('x-cypress-test-auth') === 'true';
  const isTestEnvironment = process.env.NODE_ENV !== 'production';
  
  if (isProtectedRoute(req)) {
    // Allow test authentication to bypass Clerk in non-production environments
    if (isTestAuth && isTestEnvironment) {
      return;
    }
    
    // Protect the route with Clerk authentication
    const session = await auth.protect();
    
    // If we have a valid session, check if the user exists in our profiles table
    if (session && session.userId) {
      try {
        // Get the Supabase client
        const supabase = createClient();
        
        // Check if the user has a profile
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', session.userId)
          .single();
        
        // If there's no profile, create one with default role
        if (error && error.code === 'PGRST116') { // PGRST116 is 'not found'
          await supabase
            .from('profiles')
            .insert({
              user_id: session.userId,
              role: 'user'
            });
        }
      } catch (error) {
        console.error('Error checking/creating user profile:', error);
      }
    }
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
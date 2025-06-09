import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isProtectedRoute = createRouteMatcher(['/dashboard(.*)', '/readings(.*)', '/runs(.*)', '/months(.*)'])

export default clerkMiddleware(async (auth, req) => {
  // Check for test authentication header
  const isTestAuth = req.headers.get('x-cypress-test-auth') === 'true';
  const isTestEnvironment = process.env.NODE_ENV !== 'production';
  
  if (isProtectedRoute(req)) {
    // Allow test authentication to bypass Clerk in non-production environments
    if (isTestAuth && isTestEnvironment) {
      return;
    }
    await auth.protect();
  }
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};

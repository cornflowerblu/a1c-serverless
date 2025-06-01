import { AuthToken } from '@/types/globals';
import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

export async function GET() {
  const { sessionClaims } = await auth();

  const claims: AuthToken = sessionClaims as unknown as AuthToken;

  const {
    role,
    sub,
    user_metadata: { name: fullName },
  } = claims;

  return NextResponse.json({ fullName, role, sub });
}

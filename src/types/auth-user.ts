/**
 * Types for working with auth.users and profiles in Supabase
 */

export interface AuthUser {
  id: string;
  email: string;
  created_at: string;
  updated_at: string;
  
  // Metadata fields
  user_metadata: {
    first_name?: string;
    last_name?: string;
    name?: string;
    clerk_id?: string;
    [key: string]: any;
  };
}

export type UserRole = 'admin' | 'user' | 'caregiver';

export interface Profile {
  id: number;
  user_id: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface UserWithProfile extends AuthUser {
  profile?: Profile;
}

/**
 * Get the user's full name from their metadata
 */
export function getUserName(user: AuthUser): string {
  const firstName = user.user_metadata?.first_name || '';
  const lastName = user.user_metadata?.last_name || '';
  const fullName = user.user_metadata?.name;
  
  if (fullName) return fullName;
  return `${firstName} ${lastName}`.trim();
}

/**
 * Get the user's role from their profile
 */
export function getUserRole(user: UserWithProfile): UserRole {
  return user.profile?.role || 'user';
}

/**
 * Get the user's Clerk ID from their metadata
 */
export function getClerkId(user: AuthUser): string | undefined {
  return user.user_metadata?.clerk_id;
}
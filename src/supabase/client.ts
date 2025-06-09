import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/supabase';
import { AuthUser, Profile, UserWithProfile } from '../types/auth-user';

/**
 * Creates a Supabase client with the appropriate configuration
 * @returns Supabase client instance
 */
export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables');
  }
  
  return createSupabaseClient<Database>(supabaseUrl, supabaseKey);
}

/**
 * Creates a Supabase admin client with service role permissions
 * @returns Supabase admin client instance
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase admin environment variables');
  }
  
  return createSupabaseClient<Database>(supabaseUrl, supabaseServiceKey);
}

/**
 * Fetches a user with their profile
 * @param userId The user ID to fetch
 * @returns The user with their profile, or null if not found
 */
export async function getUserWithProfile(userId: string): Promise<UserWithProfile | null> {
  const supabase = createClient();
  
  // Fetch the user from auth.users
  const { data: userData, error: userError } = await supabase.auth.getUser(userId);
  
  if (userError || !userData?.user) {
    console.error('Error fetching user:', userError);
    return null;
  }
  
  // Fetch the user's profile
  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .single();
  
  if (profileError && profileError.code !== 'PGRST116') { // PGRST116 is 'not found'
    console.error('Error fetching profile:', profileError);
  }
  
  // Combine the user and profile data
  const user = userData.user as AuthUser;
  const profile = profileData as Profile | null;
  
  return {
    ...user,
    profile: profile || undefined
  };
}

/**
 * Fetches the current user with their profile
 * @returns The current user with their profile, or null if not authenticated
 */
export async function getCurrentUserWithProfile(): Promise<UserWithProfile | null> {
  const supabase = createClient();
  
  // Get the current session
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  
  if (sessionError || !sessionData?.session?.user?.id) {
    console.error('Error fetching session:', sessionError);
    return null;
  }
  
  return getUserWithProfile(sessionData.session.user.id);
}

/**
 * Updates a user's profile
 * @param userId The user ID to update
 * @param profileData The profile data to update
 * @returns Success status
 */
export async function updateUserProfile(userId: string, profileData: Partial<Profile>): Promise<boolean> {
  const supabase = createClient();
  
  const { error } = await supabase
    .from('profiles')
    .update(profileData)
    .eq('user_id', userId);
  
  if (error) {
    console.error('Error updating profile:', error);
    return false;
  }
  
  return true;
}

/**
 * Gets a user's role
 * @param userId The user ID to check
 * @returns The user's role or 'user' if not found
 */
export async function getUserRole(userId: string): Promise<string> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', userId)
    .single();
  
  if (error || !data) {
    console.error('Error fetching user role:', error);
    return 'user';
  }
  
  return data.role;
}

/**
 * Checks if a user is an admin
 * @param userId The user ID to check
 * @returns Whether the user is an admin
 */
export async function isAdmin(userId: string): Promise<boolean> {
  const role = await getUserRole(userId);
  return role === 'admin';
}

/**
 * Checks if a user is a caregiver for another user
 * @param caregiverId The caregiver user ID
 * @param patientId The patient user ID
 * @returns Whether the caregiver relationship exists
 */
export async function isCaregiverFor(caregiverId: string, patientId: string): Promise<boolean> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('user_connections')
    .select('id')
    .eq('caregiver_id', caregiverId)
    .eq('user_id', patientId)
    .single();
  
  if (error) {
    return false;
  }
  
  return !!data;
}
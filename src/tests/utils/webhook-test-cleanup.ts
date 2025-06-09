/**
 * Webhook Test Cleanup Utility
 * 
 * This module provides utilities for cleaning up test data after webhook tests,
 * ensuring that test users are properly removed from the database.
 */

import { createClient } from '@supabase/supabase-js';

/**
 * Cleanup options interface
 */
export interface CleanupOptions {
  supabaseUrl?: string;
  supabaseKey?: string;
  testUserPrefix?: string;
}

/**
 * Cleanup result interface
 */
export interface CleanupResult {
  success: boolean;
  message: string;
  removedCount?: number;
  errors?: string[];
}

/**
 * Create a Supabase client for cleanup operations
 */
function createCleanupClient(options: CleanupOptions = {}) {
  const supabaseUrl = options.supabaseUrl || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseKey = options.supabaseKey || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase credentials for cleanup');
  }
  
  return createClient(supabaseUrl, supabaseKey);
}

/**
 * Remove a specific test user from the database
 */
export async function removeTestUser(
  userId: string,
  options: CleanupOptions = {}
): Promise<CleanupResult> {
  const supabase = createCleanupClient(options);
  
  try {
    // First, check if the user exists
    const { data: userData, error: fetchError } = await supabase
      .from('users')
      .select('id, clerk_id, email')
      .eq('clerk_id', userId)
      .maybeSingle();
    
    if (fetchError) {
      return {
        success: false,
        message: `Error checking for user existence: ${fetchError.message}`,
        errors: [fetchError.message]
      };
    }
    
    if (!userData) {
      return {
        success: true,
        message: `User with clerk_id ${userId} does not exist, no cleanup needed`,
        removedCount: 0
      };
    }
    
    // Delete the user from the database
    const { error: deleteError } = await supabase
      .from('users')
      .delete()
      .eq('clerk_id', userId);
    
    if (deleteError) {
      return {
        success: false,
        message: `Error deleting user: ${deleteError.message}`,
        errors: [deleteError.message]
      };
    }
    
    // If the user has an auth record, try to delete that too
    try {
      // Find the auth user by email
      if (userData.email) {
        const { data: authUsers, error: findError } = await supabase.auth.admin.listUsers();
        
        if (!findError && authUsers) {
          const authUser = authUsers.users.find(u => u.email === userData.email);
          
          if (authUser) {
            // Delete the auth user
            const { error: authDeleteError } = await supabase.auth.admin.deleteUser(authUser.id);
            
            if (authDeleteError) {
              console.warn(`Warning: Could not delete auth user: ${authDeleteError.message}`);
            }
          }
        }
      }
    } catch (authError) {
      console.warn(`Warning: Error handling auth user cleanup: ${authError instanceof Error ? authError.message : String(authError)}`);
    }
    
    return {
      success: true,
      message: `Successfully removed user with clerk_id ${userId}`,
      removedCount: 1
    };
  } catch (error) {
    return {
      success: false,
      message: `Unexpected error during user cleanup: ${error instanceof Error ? error.message : String(error)}`,
      errors: [error instanceof Error ? error.message : String(error)]
    };
  }
}

/**
 * Remove all test users from the database
 */
export async function removeAllTestUsers(
  options: CleanupOptions = {}
): Promise<CleanupResult> {
  const supabase = createCleanupClient(options);
  const testUserPrefix = options.testUserPrefix || 'test_';
  
  try {
    // Find all test users
    const { data: testUsers, error: fetchError } = await supabase
      .from('users')
      .select('id, clerk_id, email')
      .like('clerk_id', `${testUserPrefix}%`);
    
    if (fetchError) {
      return {
        success: false,
        message: `Error fetching test users: ${fetchError.message}`,
        errors: [fetchError.message]
      };
    }
    
    if (!testUsers || testUsers.length === 0) {
      return {
        success: true,
        message: 'No test users found, nothing to clean up',
        removedCount: 0
      };
    }
    
    // Delete all test users
    const errors: string[] = [];
    let successCount = 0;
    
    for (const user of testUsers) {
      const result = await removeTestUser(user.clerk_id, options);
      
      if (result.success) {
        successCount++;
      } else if (result.errors) {
        errors.push(...result.errors);
      }
    }
    
    return {
      success: errors.length === 0,
      message: `Removed ${successCount} of ${testUsers.length} test users`,
      removedCount: successCount,
      errors: errors.length > 0 ? errors : undefined
    };
  } catch (error) {
    return {
      success: false,
      message: `Unexpected error during test user cleanup: ${error instanceof Error ? error.message : String(error)}`,
      errors: [error instanceof Error ? error.message : String(error)]
    };
  }
}

/**
 * Verify that all test data has been cleaned up
 */
export async function verifyCleanupComplete(
  options: CleanupOptions = {}
): Promise<CleanupResult> {
  const supabase = createCleanupClient(options);
  const testUserPrefix = options.testUserPrefix || 'test_';
  
  try {
    // Check if any test users remain
    const { data: remainingUsers, error: fetchError } = await supabase
      .from('users')
      .select('id, clerk_id')
      .like('clerk_id', `${testUserPrefix}%`);
    
    if (fetchError) {
      return {
        success: false,
        message: `Error verifying cleanup: ${fetchError.message}`,
        errors: [fetchError.message]
      };
    }
    
    if (remainingUsers && remainingUsers.length > 0) {
      return {
        success: false,
        message: `Cleanup incomplete: ${remainingUsers.length} test users remain`,
        errors: remainingUsers.map(user => `User with clerk_id ${user.clerk_id} still exists`)
      };
    }
    
    return {
      success: true,
      message: 'Cleanup verification successful: no test users remain',
      removedCount: 0
    };
  } catch (error) {
    return {
      success: false,
      message: `Unexpected error during cleanup verification: ${error instanceof Error ? error.message : String(error)}`,
      errors: [error instanceof Error ? error.message : String(error)]
    };
  }
}
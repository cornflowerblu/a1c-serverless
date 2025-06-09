// @ts-nocheck
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Job types for user sync operations
const JOB_TYPES = {
  USER_CREATED: 'USER_CREATED',
  USER_UPDATED: 'USER_UPDATED',
  USER_DELETED: 'USER_DELETED'
};

// Function to map Clerk roles to your application roles
function mapClerkRoleToUserRole(userData) {
  // Check for role in public_metadata or private_metadata
  const clerkRole =
    userData.public_metadata?.role ||
    userData.private_metadata?.role ||
    userData.unsafe_metadata?.role;

  // If no role is provided, default to 'user'
  if (!clerkRole) return 'user';

  // Map Clerk roles to your UserRole enum values
  switch (clerkRole.toLowerCase()) {
    case 'admin':
    case 'administrator':
      return 'admin';
    case 'caregiver':
    case 'care_giver':
    case 'care-giver':
      return 'caregiver';
    case 'user':
    case 'standard':
    case 'default':
    default:
      return 'user';
  }
}

// Process user creation job
async function processUserCreationJob(supabase, job) {
  const { clerk_id, email, name, user_role, original_event } = job.payload;

  try {
    // Check if user already exists
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select()
      .eq('clerk_id', clerk_id)
      .maybeSingle();

    if (checkError) {
      console.error('Error checking for existing user:', checkError);
      return { success: false, error: checkError };
    }

    if (existingUser) {
      console.log('User already exists:', existingUser);
      return { success: true, message: 'User already exists', user: existingUser };
    }

    // Create user in Supabase Auth
    try {
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email: email,
        email_confirm: true,
        user_metadata: {
          clerk_id: clerk_id,
          full_name: name,
          role: user_role,
        },
      });

      if (authError) {
        console.error('Error creating auth user:', authError);
      } else {
        console.log('Auth user created successfully:', authUser);
      }
    } catch (authCreateError) {
      console.error('Exception creating auth user:', authCreateError);
    }

    // Create user in custom users table
    const { data, error } = await supabase
      .from('users')
      .insert({
        clerk_id: clerk_id,
        email: email,
        name: name,
        user_role: user_role,
        updatedAt: new Date(),
      })
      .select();

    if (error) {
      console.error('Error creating user:', error);
      return { success: false, error };
    }

    console.log('User created successfully:', data);
    return { success: true, data };
  } catch (err) {
    console.error('Error processing user creation job:', err);
    return { success: false, error: err };
  }
}

// Process user update job
async function processUserUpdateJob(supabase, job) {
  const { clerk_id, email, name, user_role, original_event } = job.payload;

  try {
    // Update user in custom users table
    const { error } = await supabase
      .from('users')
      .update({
        email: email,
        name: name,
        user_role: user_role,
        updatedAt: new Date(),
      })
      .eq('clerk_id', clerk_id);

    if (error) {
      console.error('Error updating user:', error);
      return { success: false, error };
    }

    // Update user in Supabase Auth
    try {
      // Find the auth user by email
      const { data: authUsers, error: findError } = await supabase.auth.admin.listUsers();

      if (findError) {
        console.error('Error finding auth user:', findError);
      } else {
        const user = authUsers.users.find(u => u.email === email);

        if (user) {
          // Update the auth user
          const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
            email: email,
            user_metadata: {
              clerk_id: clerk_id,
              full_name: name,
              role: user_role,
            },
          });

          if (updateError) {
            console.error('Error updating auth user:', updateError);
          } else {
            console.log('Auth user updated successfully');
          }
        }
      }
    } catch (authUpdateError) {
      console.error('Exception updating auth user:', authUpdateError);
    }

    console.log('User updated successfully');
    return { success: true };
  } catch (err) {
    console.error('Error processing user update job:', err);
    return { success: false, error: err };
  }
}

// Process user deletion job
async function processUserDeletionJob(supabase, job) {
  const { clerk_id, email } = job.payload;

  try {
    // Delete user from custom users table
    const { error } = await supabase.from('users').delete().eq('clerk_id', clerk_id);

    if (error) {
      console.error('Error deleting user:', error);
      return { success: false, error };
    }

    // Delete user from Supabase Auth
    if (email) {
      try {
        // Find the auth user by email
        const { data: authUsers, error: findError } = await supabase.auth.admin.listUsers();

        if (findError) {
          console.error('Error finding auth user for deletion:', findError);
        } else {
          const user = authUsers.users.find(u => u.email === email);

          if (user) {
            // Delete the auth user
            const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);

            if (deleteError) {
              console.error('Error deleting auth user:', deleteError);
            } else {
              console.log('Auth user deleted successfully');
            }
          }
        }
      } catch (authDeleteError) {
        console.error('Exception deleting auth user:', authDeleteError);
      }
    }

    console.log('User deleted successfully');
    return { success: true };
  } catch (err) {
    console.error('Error processing user deletion job:', err);
    return { success: false, error: err };
  }
}

// Update job status
async function updateJobStatus(supabase, jobId, status, result = null) {
  try {
    const updateData = {
      status,
      processed_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (result) {
      if (result.error) {
        updateData.error = typeof result.error === 'string' 
          ? result.error 
          : JSON.stringify(result.error);
      }
      
      if (result.data) {
        updateData.result = typeof result.data === 'string'
          ? result.data
          : JSON.stringify(result.data);
      }
    }

    const { error } = await supabase
      .from('job_queue')
      .update(updateData)
      .eq('id', jobId);

    if (error) {
      console.error(`Error updating job ${jobId} status:`, error);
      return false;
    }

    return true;
  } catch (err) {
    console.error(`Exception updating job ${jobId} status:`, err);
    return false;
  }
}

// Process next pending job
async function processNextJob(supabase) {
  try {
    // Get next pending job
    const { data: jobs, error: fetchError } = await supabase
      .from('job_queue')
      .select('*')
      .eq('status', 'PENDING')
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(1);

    if (fetchError) {
      console.error('Error fetching next job:', fetchError);
      return { success: false, error: fetchError };
    }

    if (!jobs || jobs.length === 0) {
      // No pending jobs
      return { success: true, message: 'No pending jobs' };
    }

    const job = jobs[0];

    // Mark job as processing
    const { error: updateError } = await supabase
      .from('job_queue')
      .update({
        status: 'PROCESSING',
        updated_at: new Date().toISOString()
      })
      .eq('id', job.id);

    if (updateError) {
      console.error(`Error updating job ${job.id} to processing:`, updateError);
      return { success: false, error: updateError };
    }

    // Process job based on type
    let result;
    switch (job.job_type) {
      case JOB_TYPES.USER_CREATED:
        result = await processUserCreationJob(supabase, job);
        break;
      case JOB_TYPES.USER_UPDATED:
        result = await processUserUpdateJob(supabase, job);
        break;
      case JOB_TYPES.USER_DELETED:
        result = await processUserDeletionJob(supabase, job);
        break;
      default:
        result = { 
          success: false, 
          error: `Unknown job type: ${job.job_type}` 
        };
    }

    // Update job status based on result
    const status = result.success ? 'COMPLETED' : 'FAILED';
    await updateJobStatus(supabase, job.id, status, result);

    return {
      success: result.success,
      jobId: job.id,
      jobType: job.job_type,
      result
    };
  } catch (err) {
    console.error('Error processing job:', err);
    return { success: false, error: err };
  }
}

// Main handler for the job processor
Deno.serve(async (req) => {
  // Initialize Supabase client
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Process a single job
    const result = await processNextJob(supabase);

    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' },
      status: result.success ? 200 : 500
    });
  } catch (err) {
    console.error('Error in job processor:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
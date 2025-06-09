// @ts-nocheck
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Job types for user sync operations
const JOB_TYPES = {
  USER_CREATED: 'user_created',
  USER_UPDATED: 'user_updated',
  USER_DELETED: 'user_deleted',
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
    // Check if user already exists in auth system
    const { data: authUsers, error: findError } = await supabase.auth.admin.listUsers();

    if (findError) {
      console.error('Error finding existing users:', findError);
      return { success: false, error: findError };
    }

    const existingUser = authUsers.users.find(u => u.email === email);

    if (existingUser) {
      console.log('User already exists in auth system:', existingUser.id);
      return { success: true, message: 'User already exists', user: existingUser };
    }

    // Create user in Supabase Auth only
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
      return { success: false, error: authError };
    }

    console.log('Auth user created successfully:', authUser);
    return { success: true, data: authUser };
  } catch (err) {
    console.error('Error processing user creation job:', err);
    return { success: false, error: err };
  }
}

// Process user update job
async function processUserUpdateJob(supabase, job) {
  const { clerk_id, email, name, user_role, original_event } = job.payload;

  try {
    // Update user in Supabase Auth only
    // Find the auth user by email
    const { data: authUsers, error: findError } = await supabase.auth.admin.listUsers();

    if (findError) {
      console.error('Error finding auth user:', findError);
      return { success: false, error: findError };
    }

    const user = authUsers.users.find(u => u.email === email);

    if (!user) {
      console.error('Auth user not found for update');
      return { success: false, error: 'User not found' };
    }

    // Update the auth user
    const { data: updatedUser, error: updateError } = await supabase.auth.admin.updateUserById(
      user.id,
      {
        email: email,
        user_metadata: {
          clerk_id: clerk_id,
          full_name: name,
          role: user_role,
        },
      }
    );

    if (updateError) {
      console.error('Error updating auth user:', updateError);
      return { success: false, error: updateError };
    }

    console.log('Auth user updated successfully');
    return { success: true, data: updatedUser };
  } catch (err) {
    console.error('Error processing user update job:', err);
    return { success: false, error: err };
  }
}

// Process user deletion job
async function processUserDeletionJob(supabase, job) {
  const { clerk_id, email } = job.payload;

  try {
    // Delete user from Supabase Auth only
    if (email) {
      // Find the auth user by email
      const { data: authUsers, error: findError } = await supabase.auth.admin.listUsers();

      if (findError) {
        console.error('Error finding auth user for deletion:', findError);
        return { success: false, error: findError };
      }

      const user = authUsers.users.find(u => u.email === email);

      if (!user) {
        console.log('User not found for deletion');
        return { success: true, message: 'User not found' };
      }

      // Delete the auth user
      const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);

      if (deleteError) {
        console.error('Error deleting auth user:', deleteError);
        return { success: false, error: deleteError };
      }

      console.log('Auth user deleted successfully');
      return { success: true };
    } else {
      console.error('No email provided for user deletion');
      return { success: false, error: 'No email provided for deletion' };
    }
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
      updated_at: new Date().toISOString(),
    };

    if (result) {
      if (result.error) {
        updateData.error =
          typeof result.error === 'string' ? result.error : JSON.stringify(result.error);
      }

      if (result.data) {
        updateData.result =
          typeof result.data === 'string' ? result.data : JSON.stringify(result.data);
      }
    }

    const { error } = await supabase.from('job_queue').update(updateData).eq('id', jobId);

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
        updated_at: new Date().toISOString(),
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
          error: `Unknown job type: ${job.job_type}`,
        };
    }

    // Update job status based on result
    const status = result.success ? 'COMPLETED' : 'FAILED';
    await updateJobStatus(supabase, job.id, status, result);

    return {
      success: result.success,
      jobId: job.id,
      jobType: job.job_type,
      result,
    };
  } catch (err) {
    console.error('Error processing job:', err);
    return { success: false, error: err };
  }
}

// Main handler for the job processor
Deno.serve(async req => {
  // Initialize Supabase client
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Process a single job
    const result = await processNextJob(supabase);

    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' },
      status: result.success ? 200 : 500,
    });
  } catch (err) {
    console.error('Error in job processor:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});

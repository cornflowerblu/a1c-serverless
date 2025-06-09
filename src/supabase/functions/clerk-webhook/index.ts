// @ts-nocheck
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Webhook } from 'https://esm.sh/svix@1.15.0';

// Function to create a job in the job_queue table
async function createJob(supabase, jobType, payload, priority = 1) {
  try {
    const { data, error } = await supabase.from("job_queue").insert({
      job_type: jobType,
      payload,
      status: "PENDING",
      priority,
    }).select();

    if (error) {
      console.error(`Error creating ${jobType} job:`, error);
      return {
        success: false,
        error,
      };
    }
    console.log(`${jobType} job created successfully:`, data[0].id);
    return {
      success: true,
      jobId: data[0].id,
    };
  } catch (err) {
    console.error(`Exception creating ${jobType} job:`, err);
    return {
      success: false,
      error: err,
    };
  }
}

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

// Function to verify the webhook signature
const verifyWebhookSignature = async (req: Request, webhookSecret: string) => {
  const payload = await req.text();
  const signature = req.headers.get('svix-signature');
  const timestamp = req.headers.get('svix-timestamp');
  const id = req.headers.get('svix-id');

  if (!signature || !timestamp || !id) {
    return { verified: false, payload: null };
  }

  const webhook = new Webhook(webhookSecret);
  try {
    const event = webhook.verify(payload, {
      'svix-id': id,
      'svix-timestamp': timestamp,
      'svix-signature': signature,
    });
    return { verified: true, payload: JSON.parse(payload) };
  } catch (err) {
    console.error('Webhook verification failed:', err);
    return { verified: false, payload: null };
  }
};

Deno.serve(async req => {
  // Get the webhook secret from environment variables
  const webhookSecret = Deno.env.get('CLERK_WEBHOOK_SECRET') || '';

  // Always verify webhook signature
  const verificationResult = await verifyWebhookSignature(req, webhookSecret);
  if (!verificationResult.verified) {
    return new Response(JSON.stringify({ error: 'Invalid signature' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  const payload = verificationResult.payload;

  const eventType = payload.type;

  // Initialize Supabase client
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Handle user creation
    if (eventType === 'user.created') {
      const { id: clerkId, email_addresses, ...userData } = payload.data;

      // Extract primary email
      const primaryEmail = email_addresses.find(
        email => email.id === payload.data.primary_email_address_id
      )?.email_address;

      // Check if user already exists in auth system
      const { data: authUsers, error: checkError } = await supabase.auth.admin.listUsers();

      if (checkError) {
        console.error('Error checking for existing user:', checkError);
        return new Response(JSON.stringify({ error: 'Failed to check for existing user' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const existingUser = authUsers?.users?.find(u => u.user_metadata?.clerk_id === clerkId);

      if (existingUser) {
        console.log('User already exists:', existingUser);
        return new Response(
          JSON.stringify({ message: 'User already exists', user: existingUser }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      // Prepare user data
      const firstName = payload.data.first_name || '';
      const lastName = payload.data.last_name || '';
      const fullName = `${firstName} ${lastName}`.trim();
      const userRole = mapClerkRoleToUserRole(payload.data);

      // Create user in auth.users via admin API
      const { data: authUser, error: createError } = await supabase.auth.admin.createUser({
        email: primaryEmail,
        email_confirm: true,
        user_metadata: {
          first_name: firstName,
          last_name: lastName,
          name: fullName,
          clerk_id: clerkId
        }
      });

      if (createError) {
        console.error('Error creating user in auth.users:', createError);
        return new Response(JSON.stringify({ error: 'Failed to create user' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // The trigger should create the profile automatically, but we update the role here
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ role: userRole })
        .eq('user_id', authUser.user.id);

      if (profileError) {
        console.error('Error updating user profile:', profileError);
        // Don't fail the request, just log the error
      }

      // Add job to the queue for further processing if needed
      const jobResult = await createJob(supabase, 'user_created', {
        user_id: authUser.user.id,
        clerk_id: clerkId,
        email: primaryEmail,
        role: userRole
      });
      
      if (!jobResult.success) {
        console.error('Error creating user_created job:', jobResult.error);
        // Don't fail the request, just log the error
      }

      console.log('User created successfully:', authUser);
      return new Response(
        JSON.stringify({ success: true, user: authUser }),
        {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Handle user updates
    else if (eventType === 'user.updated') {
      const { id: clerkId, email_addresses, ...userData } = payload.data;
      const primaryEmail = email_addresses.find(
        email => email.id === payload.data.primary_email_address_id
      )?.email_address;

      // Find the user by clerk_id in user_metadata
      const { data: authUsers, error: findError } = await supabase.auth.admin.listUsers();
      
      if (findError) {
        console.error('Error finding user:', findError);
        return new Response(JSON.stringify({ error: 'Failed to find user' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const existingUser = authUsers?.users?.find(u => u.user_metadata?.clerk_id === clerkId);
      
      if (!existingUser) {
        console.error('User not found for update:', clerkId);
        return new Response(JSON.stringify({ error: 'User not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Prepare user data
      const firstName = payload.data.first_name || '';
      const lastName = payload.data.last_name || '';
      const fullName = `${firstName} ${lastName}`.trim();
      const userRole = mapClerkRoleToUserRole(payload.data);

      // Update user metadata
      const { error: updateError } = await supabase.auth.admin.updateUserById(
        existingUser.id,
        {
          email: primaryEmail,
          user_metadata: {
            ...existingUser.user_metadata,
            first_name: firstName,
            last_name: lastName,
            name: fullName,
          }
        }
      );

      if (updateError) {
        console.error('Error updating user:', updateError);
        return new Response(JSON.stringify({ error: 'Failed to update user' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Update the user's profile with the role
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ role: userRole })
        .eq('user_id', existingUser.id);

      if (profileError) {
        console.error('Error updating user profile:', profileError);
        // Don't fail the request, just log the error
      }

      // Add job to the queue for further processing if needed
      const jobResult = await createJob(supabase, 'user_updated', {
        user_id: existingUser.id,
        clerk_id: clerkId,
        email: primaryEmail,
        role: userRole
      });
      
      if (!jobResult.success) {
        console.error('Error creating user_updated job:', jobResult.error);
        // Don't fail the request, just log the error
      }

      console.log('User updated successfully:', existingUser.id);
      return new Response(
        JSON.stringify({ success: true, userId: existingUser.id }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Handle user deletion
    else if (eventType === 'user.deleted') {
      const clerkId = payload.data.id;

      // Find the user by clerk_id in user_metadata
      const { data: authUsers, error: findError } = await supabase.auth.admin.listUsers();
      
      if (findError) {
        console.error('Error finding user:', findError);
        return new Response(JSON.stringify({ error: 'Failed to find user' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const existingUser = authUsers?.users?.find(u => u.user_metadata?.clerk_id === clerkId);
      
      if (!existingUser) {
        console.error('User not found for deletion:', clerkId);
        return new Response(JSON.stringify({ error: 'User not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Add job to the queue before deletion for any cleanup tasks
      const jobResult = await createJob(supabase, 'user_deleted', {
        user_id: existingUser.id,
        clerk_id: clerkId,
        email: existingUser.email
      });
      
      if (!jobResult.success) {
        console.error('Error creating user_deleted job:', jobResult.error);
        // Don't fail the request, just log the error
      }

      // Delete the user
      const { error: deleteError } = await supabase.auth.admin.deleteUser(existingUser.id);

      if (deleteError) {
        console.error('Error deleting user:', deleteError);
        return new Response(JSON.stringify({ error: 'Failed to delete user' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      console.log('User deleted successfully:', existingUser.id);
      return new Response(
        JSON.stringify({ success: true, userId: existingUser.id }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Error processing webhook:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
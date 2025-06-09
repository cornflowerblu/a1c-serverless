// @ts-nocheck
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Webhook } from 'https://esm.sh/svix@1.15.0';

// Job types for user sync operations
const JOB_TYPES = {
  USER_CREATED: 'USER_CREATED',
  USER_UPDATED: 'USER_UPDATED',
  USER_DELETED: 'USER_DELETED',
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

// Function to create a job in the job queue
async function createJob(supabase, jobType, payload, priority = 1) {
  try {
    const { data, error } = await supabase
      .from('job_queue')
      .insert({
        job_type: jobType,
        payload,
        status: 'PENDING',
        priority,
      })
      .select();

    if (error) {
      console.error(`Error creating ${jobType} job:`, error);
      return { success: false, error };
    }

    console.log(`${jobType} job created successfully:`, data[0].id);
    return { success: true, jobId: data[0].id };
  } catch (err) {
    console.error(`Exception creating ${jobType} job:`, err);
    return { success: false, error: err };
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
  const webhookSecret =
    Deno.env.get('CLERK_WEBHOOK_SECRET') || '';
  const isProd = Deno.env.get('ENVIRONMENT') === 'production';

  let payload;

  if (isProd) {
    // Only verify webhook signature in production
    const verificationResult = await verifyWebhookSignature(req, webhookSecret);
    if (!verificationResult.verified) {
      return new Response(JSON.stringify({ error: 'Invalid signature' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    payload = verificationResult.payload;
  } else {
    // In non-production environments, skip signature verification
    try {
      const rawBody = await req.text();
      payload = JSON.parse(rawBody);
      console.log('Development mode: Skipping webhook signature verification');
    } catch (err) {
      console.error('Error parsing webhook payload:', err);
      return new Response(JSON.stringify({ error: 'Invalid payload format' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

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

      // Prepare job payload
      const fullName = `${payload.data.first_name || ''} ${payload.data.last_name || ''}`.trim();
      const userRole = mapClerkRoleToUserRole(payload.data);

      const jobPayload = {
        clerk_id: clerkId,
        email: primaryEmail,
        name: fullName,
        user_role: userRole,
        original_event: payload,
        created_at: new Date().toISOString(),
        retry_count: 0,
      };

      // Create job in queue instead of directly processing
      const { success, jobId, error } = await createJob(
        supabase,
        JOB_TYPES.USER_CREATED,
        jobPayload,
        2 // Higher priority for user creation
      );

      if (!success) {
        console.error('Failed to create user creation job:', error);
        return new Response(JSON.stringify({ error: 'Failed to queue user creation' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      console.log('User creation job queued successfully:', jobId);
      return new Response(
        JSON.stringify({ success: true, message: 'User creation job queued', jobId }),
        {
          status: 202, // Accepted
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

      // Check if role has changed in metadata
      const updatedRole = mapClerkRoleToUserRole(payload.data);
      const fullName = `${payload.data.first_name || ''} ${payload.data.last_name || ''}`.trim();

      // Prepare job payload
      const jobPayload = {
        clerk_id: clerkId,
        email: primaryEmail,
        name: fullName,
        user_role: updatedRole,
        original_event: payload,
        created_at: new Date().toISOString(),
        retry_count: 0,
      };

      // Create job in queue instead of directly processing
      const { success, jobId, error } = await createJob(
        supabase,
        JOB_TYPES.USER_UPDATED,
        jobPayload
      );

      if (!success) {
        console.error('Failed to create user update job:', error);
        return new Response(JSON.stringify({ error: 'Failed to queue user update' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      console.log('User update job queued successfully:', jobId);
      return new Response(
        JSON.stringify({ success: true, message: 'User update job queued', jobId }),
        {
          status: 202, // Accepted
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Handle user deletion
    else if (eventType === 'user.deleted') {
      const clerkId = payload.data.id;

      // Get user email before queueing deletion
      const { data: authUsers, error: fetchError } = await supabase.auth.admin.listUsers();

      if (fetchError && fetchError.code !== 'PGRST116') {
        // PGRST116 is 'not found'
        console.error('Error fetching user before deletion:', fetchError);
      }

      const userData = authUsers?.users?.find(u => u.user_metadata?.clerk_id === clerkId);

      // Prepare job payload
      const jobPayload = {
        clerk_id: clerkId,
        email: userData?.email,
        original_event: payload,
        created_at: new Date().toISOString(),
        retry_count: 0,
      };

      // Create job in queue instead of directly processing
      const { success, jobId, error } = await createJob(
        supabase,
        JOB_TYPES.USER_DELETED,
        jobPayload
      );

      if (!success) {
        console.error('Failed to create user deletion job:', error);
        return new Response(JSON.stringify({ error: 'Failed to queue user deletion' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      console.log('User deletion job queued successfully:', jobId);
      return new Response(
        JSON.stringify({ success: true, message: 'User deletion job queued', jobId }),
        {
          status: 202, // Accepted
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

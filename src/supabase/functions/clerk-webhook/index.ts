// @ts-nocheck
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Webhook } from 'https://esm.sh/svix@1.15.0';

// Function to map Clerk roles to your application roles
function mapClerkRoleToUserRole(userData) {
  // Check for role in public_metadata or private_metadata
  const clerkRole = userData.public_metadata?.role ||
                   userData.private_metadata?.role ||
                   userData.unsafe_metadata?.role;

  // If no role is provided, default to 'user'
  if (!clerkRole) return 'user';

  // Map Clerk roles to your UserRole enum values
  switch(clerkRole.toLowerCase()) {
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

  // Verify the webhook signature
  const { verified, payload } = await verifyWebhookSignature(req, webhookSecret);
  if (!verified) {
    return new Response(JSON.stringify({ error: 'Invalid signature' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
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

      // Check if user already exists
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select()
        .eq('clerk_id', clerkId)
        .maybeSingle();

      if (checkError) {
        console.error('Error checking for existing user:', checkError);
        return new Response(JSON.stringify({ error: 'Failed to check for existing user' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }

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

      // Create user in Supabase
      const { data, error } = await supabase
    .from('users')
    .insert({
      clerk_id: clerkId,
      email: primaryEmail,
      name: `${payload.data.first_name || ''} ${payload.data.last_name || ''}`.trim(),
      user_role: mapClerkRoleToUserRole(payload.data),
      "updatedAt": new Date()
    })
    .select()

      // Helper function to map Clerk roles to your application roles
      function mapClerkRoleToUserRole(userData) {
        // Check for role in public_metadata or private_metadata
        const clerkRole =
          userData.public_metadata?.role ||
          userData.private_metadata?.role ||
          userData.unsafe_metadata?.role;

        // If no role is provided, default to 'user'
        if (!clerkRole) return 'user';

        // Map Clerk roles to your UserRole enum values
        // Adjust this mapping based on your actual role names in Clerk
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

      if (error) {
        console.error('Error creating user:', error);
        return new Response(JSON.stringify({ error: 'Failed to create user' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      console.log('User created successfully:', data);
    }

    // Handle user updates
    else if (eventType === 'user.updated') {
      const { id: clerkId, email_addresses, ...userData } = payload.data;
      const primaryEmail = email_addresses.find(
        email => email.id === payload.data.primary_email_address_id
      )?.email_address;

      // Check if role has changed in metadata
      const updatedRole = mapClerkRoleToUserRole(payload.data);

      const { error } = await supabase
        .from('users')
        .update({
          email: primaryEmail,
          name: `${payload.data.first_name || ''} ${payload.data.last_name || ''}`.trim(),
          // Only update role if it has changed in Clerk
          ...(updatedRole ? { user_role: updatedRole } : {}),
          updatedAt: new Date(),
        })
        .eq('clerk_id', clerkId);

      if (error) {
        console.error('Error updating user:', error);
        return new Response(JSON.stringify({ error: 'Failed to update user' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      console.log('User updated successfully');
    }

    // Handle user deletion
    else if (eventType === 'user.deleted') {
      const clerkId = payload.data.id;

      // Option 1: Hard delete the user
      const { error } = await supabase.from('users').delete().eq('clerk_id', clerkId);

      // Option 2: Soft delete (recommended for data integrity)
      // const { error } = await supabase
      //   .from('users')
      //   .update({
      //     "updatedAt": new Date(),
      //     // If you've added the deleted_at column:
      //     // deleted_at: new Date().toISOString()
      //   })
      //   .eq('clerk_id', clerkId)

      if (error) {
        console.error('Error deleting user:', error);
        return new Response(JSON.stringify({ error: 'Failed to delete user' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      console.log('User deleted successfully');
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

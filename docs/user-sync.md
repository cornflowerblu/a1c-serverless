# Synchronizing Users Between Clerk and Supabase

This document outlines the webhook-based approach for keeping user data synchronized between Clerk (authentication provider) and Supabase (database).

## Overview

When a user signs up or updates their profile in Clerk, we need to ensure that their data is also created or updated in our Supabase database. This synchronization is critical for maintaining consistent user data across our authentication and database systems.

## Webhook Approach

The webhook approach uses Clerk's webhook events to trigger updates in our Supabase database whenever user-related events occur in Clerk.

### How It Works

1. Clerk sends a webhook event to our Supabase Edge Function when user events occur
2. Our Edge Function processes the event and performs the corresponding operation in Supabase
3. This ensures our Supabase database stays in sync with Clerk's user data

### Advantages

- **Reliability**: Works regardless of client-side execution
- **Comprehensive**: Handles all user lifecycle events (creation, updates, deletion)
- **Decoupled**: Separates authentication logic from application code
- **Serverless**: Aligns with our serverless architecture
- **Secure**: Can implement webhook signature verification

## Implementation

### 1. Create a Supabase Edge Function

Create a new Edge Function to handle Clerk webhooks:

```bash
supabase functions new clerk-webhook
```

### 2. Implement the Webhook Handler

Edit the `supabase/functions/clerk-webhook/index.ts` file:

```typescript
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Webhook } from 'https://esm.sh/svix@1.15.0'

// Function to verify the webhook signature
const verifyWebhookSignature = async (req: Request, webhookSecret: string) => {
  const payload = await req.text()
  const signature = req.headers.get('svix-signature')
  const timestamp = req.headers.get('svix-timestamp')
  const id = req.headers.get('svix-id')
  
  if (!signature || !timestamp || !id) {
    return { verified: false, payload: null }
  }
  
  const webhook = new Webhook(webhookSecret)
  try {
    const event = webhook.verify(payload, {
      'svix-id': id,
      'svix-timestamp': timestamp,
      'svix-signature': signature
    })
    return { verified: true, payload: JSON.parse(payload) }
  } catch (err) {
    console.error('Webhook verification failed:', err)
    return { verified: false, payload: null }
  }
}

Deno.serve(async (req) => {
  // Get the webhook secret from environment variables
  const webhookSecret = Deno.env.get('CLERK_WEBHOOK_SECRET') || ''
  
  // Verify the webhook signature
  const { verified, payload } = await verifyWebhookSignature(req, webhookSecret)
  if (!verified) {
    return new Response(JSON.stringify({ error: 'Invalid signature' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    })
  }
  
  const eventType = payload.type
  
  // Initialize Supabase client
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
  const supabase = createClient(supabaseUrl, supabaseKey)
  
  try {
    // Handle user creation
    if (eventType === 'user.created') {
      const { id: clerkId, email_addresses, ...userData } = payload.data
      
      // Extract primary email
      const primaryEmail = email_addresses.find(email => 
        email.id === payload.data.primary_email_address_id
      )?.email_address
      
      // Create user in Supabase
      const { data, error } = await supabase
        .from('users')
        .insert({
          clerk_id: clerkId,
          email: primaryEmail,
          name: `${payload.data.first_name || ''} ${payload.data.last_name || ''}`.trim(),
          role: 'user',
          "updatedAt": new Date(),
          // Add preferences and medical_profile if you've added these columns
          // preferences: {
          //   displayUnit: 'A1C',
          //   reminderEnabled: false,
          //   reminderFrequency: 'DAILY',
          //   theme: 'system'
          // },
          // medical_profile: {
          //   preferredUnit: 'MGDL'
          // }
        })
        .select()
        
      if (error) {
        console.error('Error creating user:', error)
        return new Response(JSON.stringify({ error: 'Failed to create user' }), { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        })
      }
      
      console.log('User created successfully:', data)
    }
    
    // Handle user updates
    else if (eventType === 'user.updated') {
      const { id: clerkId, email_addresses, ...userData } = payload.data
      const primaryEmail = email_addresses.find(email => 
        email.id === payload.data.primary_email_address_id
      )?.email_address
      
      const { error } = await supabase
        .from('users')
        .update({
          email: primaryEmail,
          name: `${payload.data.first_name || ''} ${payload.data.last_name || ''}`.trim(),
          "updatedAt": new Date()
        })
        .eq('clerk_id', clerkId)
        
      if (error) {
        console.error('Error updating user:', error)
        return new Response(JSON.stringify({ error: 'Failed to update user' }), { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        })
      }
      
      console.log('User updated successfully')
    }
    
    // Handle user deletion
    else if (eventType === 'user.deleted') {
      const clerkId = payload.data.id
      
      // Option 1: Hard delete the user
      // const { error } = await supabase
      //   .from('users')
      //   .delete()
      //   .eq('clerk_id', clerkId)
      
      // Option 2: Soft delete (recommended for data integrity)
      const { error } = await supabase
        .from('users')
        .update({
          "updatedAt": new Date(),
          // If you've added the deleted_at column:
          // deleted_at: new Date().toISOString()
        })
        .eq('clerk_id', clerkId)
        
      if (error) {
        console.error('Error deleting user:', error)
        return new Response(JSON.stringify({ error: 'Failed to delete user' }), { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        })
      }
      
      console.log('User deleted successfully')
    }
    
    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (err) {
    console.error('Error processing webhook:', err)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})
```

### 3. Deploy the Edge Function

```bash
supabase functions deploy clerk-webhook
```

### 4. Set Environment Variables

In the Supabase dashboard, set the following environment variables for your Edge Function:

- `CLERK_WEBHOOK_SECRET`: Your Clerk webhook signing secret
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key (has admin privileges)

### 5. Configure Webhook in Clerk Dashboard

1. Go to the Clerk Dashboard
2. Navigate to "Webhooks" in the sidebar
3. Click "Add Endpoint"
4. Enter your Supabase Edge Function URL:
   ```
   https://<project-ref>.supabase.co/functions/v1/clerk-webhook
   ```
5. Select the following events to monitor:
   - `user.created`
   - `user.updated`
   - `user.deleted`
6. Save the webhook configuration

### 6. Test the Webhook

1. Create a new user in Clerk
2. Check your Supabase database to verify the user was created
3. Update the user in Clerk
4. Verify the changes were synchronized to Supabase
5. Delete the user in Clerk
6. Verify the user was marked as deleted in Supabase

## Existing Database Schema

Your database already has the following users table:

```sql
CREATE TABLE public.users (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  clerk_id text NULL DEFAULT 'NULL'::text,
  email text NULL,
  name text NULL,
  role public.UserRole NOT NULL DEFAULT 'user'::"UserRole",
  "createdAt" timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp without time zone NOT NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT User_pkey PRIMARY KEY (id),
  CONSTRAINT User_clerkId_key UNIQUE (clerk_id),
  CONSTRAINT User_email_key UNIQUE (email)
);
```

### Recommended Schema Extensions

To fully support the A1C Estimator application, consider adding these columns:

```sql
-- Add preferences and medical profile columns
ALTER TABLE public.users
ADD COLUMN preferences JSONB DEFAULT '{"displayUnit": "A1C", "reminderEnabled": false, "reminderFrequency": "DAILY", "theme": "system"}'::jsonb,
ADD COLUMN medical_profile JSONB DEFAULT '{"preferredUnit": "MGDL"}'::jsonb,
ADD COLUMN deleted_at TIMESTAMPTZ;

-- Create index for faster lookups by clerk_id (if not already exists)
CREATE INDEX IF NOT EXISTS idx_users_clerk_id ON public.users(clerk_id);

-- Create RLS policies (if not already set up)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Policy for users to read their own data
CREATE POLICY users_select_own ON public.users 
  FOR SELECT 
  USING (auth.uid()::text = clerk_id);

-- Policy for users to update their own data
CREATE POLICY users_update_own ON public.users 
  FOR UPDATE 
  USING (auth.uid()::text = clerk_id);
```

## Error Handling and Monitoring

1. Set up logging for your Edge Function to capture any errors
2. Configure alerts for webhook failures
3. Implement retry logic for failed operations
4. Periodically audit user data to ensure consistency between Clerk and Supabase

## Security Considerations

1. Always verify webhook signatures to prevent unauthorized requests
2. Use the service role key only within secure server environments
3. Implement proper Row Level Security (RLS) policies in Supabase
4. Sanitize and validate all incoming data before storing it

## Fallback Mechanisms

In case webhooks fail, consider implementing these fallbacks:

1. Server-side checks during authentication to verify user existence
2. Periodic reconciliation job to sync users between systems
3. Manual admin tools to force synchronization when needed

## Conclusion

This webhook-based approach provides a reliable, serverless method for keeping user data synchronized between Clerk and Supabase. By processing events in real-time, we ensure that our application always has the most up-to-date user information available in our database.

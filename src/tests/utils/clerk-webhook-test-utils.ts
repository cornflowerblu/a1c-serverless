/**
 * Clerk Webhook Test Utilities
 * 
 * This module provides utilities for testing the Clerk webhook integration,
 * including mock event generation for user creation, updates, and deletion.
 */

/**
 * Types for Clerk webhook events
 */
export interface ClerkEmailAddress {
  id: string;
  email_address: string;
  verification: {
    status: string;
    strategy: string;
  };
}

export interface ClerkWebhookEventData {
  id: string;
  first_name?: string;
  last_name?: string;
  email_addresses: ClerkEmailAddress[];
  primary_email_address_id?: string;
  public_metadata?: Record<string, any>;
  private_metadata?: Record<string, any>;
  unsafe_metadata?: Record<string, any>;
  created_at: number;
}

export interface ClerkWebhookEvent {
  type: 'user.created' | 'user.updated' | 'user.deleted';
  data: ClerkWebhookEventData;
}

/**
 * Generate a unique test identifier to avoid conflicts
 */
export function generateTestId(): string {
  return `test_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Generate a mock Clerk email address object
 */
export function generateMockEmailAddress(email: string, isPrimary = true): ClerkEmailAddress & { id: string } {
  return {
    id: `email_${generateTestId()}`,
    email_address: email,
    verification: {
      status: 'verified',
      strategy: 'from_oauth_google',
    }
  };
}

/**
 * Generate a mock user creation event
 */
export function generateUserCreatedEvent(userData: {
  firstName?: string;
  lastName?: string;
  email: string;
  role?: 'admin' | 'caregiver' | 'user';
}): ClerkWebhookEvent {
  const emailObj = generateMockEmailAddress(userData.email);
  
  return {
    type: 'user.created',
    data: {
      id: `user_${generateTestId()}`,
      first_name: userData.firstName || 'Test',
      last_name: userData.lastName || 'User',
      email_addresses: [emailObj],
      primary_email_address_id: emailObj.id,
      public_metadata: userData.role ? { role: userData.role } : {},
      created_at: Date.now()
    }
  };
}

/**
 * Generate a mock user update event
 */
export function generateUserUpdatedEvent(
  userId: string,
  updatedData: {
    firstName?: string;
    lastName?: string;
    email?: string;
    role?: 'admin' | 'caregiver' | 'user';
  }
): ClerkWebhookEvent {
  // Create base event with existing user ID
  const emailObj = generateMockEmailAddress(updatedData.email || 'updated@example.com');
  
  return {
    type: 'user.updated',
    data: {
      id: userId,
      first_name: updatedData.firstName,
      last_name: updatedData.lastName,
      email_addresses: [emailObj],
      primary_email_address_id: emailObj.id,
      public_metadata: updatedData.role ? { role: updatedData.role } : {},
      created_at: Date.now() - 86400000 // Created 1 day ago
    }
  };
}

/**
 * Generate a mock user deletion event
 */
export function generateUserDeletedEvent(userId: string): ClerkWebhookEvent {
  return {
    type: 'user.deleted',
    data: {
      id: userId,
      email_addresses: [],
      created_at: Date.now() - 86400000 // Created 1 day ago
    }
  };
}

/**
 * Generate a malformed event for error testing
 */
export function generateMalformedEvent(type: 'missing-id' | 'invalid-type' | 'missing-email' | 'empty-payload'): any {
  switch (type) {
    case 'missing-id':
      return {
        type: 'user.created',
        data: {
          // Missing ID
          first_name: 'Test',
          last_name: 'User',
          email_addresses: [generateMockEmailAddress('test@example.com')],
          created_at: Date.now()
        }
      };
    
    case 'invalid-type':
      return {
        type: 'user.invalid_event_type',
        data: {
          id: `user_${generateTestId()}`,
          first_name: 'Test',
          last_name: 'User',
          email_addresses: [generateMockEmailAddress('test@example.com')],
          created_at: Date.now()
        }
      };
    
    case 'missing-email':
      return {
        type: 'user.created',
        data: {
          id: `user_${generateTestId()}`,
          first_name: 'Test',
          last_name: 'User',
          email_addresses: [], // Empty email addresses
          created_at: Date.now()
        }
      };
    
    case 'empty-payload':
      return {
        type: 'user.created',
        data: {}
      };
  }
}
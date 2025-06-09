// src/tests/api/a1c-edge-function.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '../../app/api/a1c-calculate/route';
import { SupabaseClient } from '@supabase/supabase-js';

// Mock the createServerSupabaseClient function
vi.mock('../../app/lib/client', () => ({
  createServerSupabaseClient: vi.fn(() => ({
    functions: {
      invoke: vi.fn(),
    },
  })),
}));

describe('A1C Calculate API with Edge Function', () => {
  let mockSupabase: { functions: { invoke: { mockResolvedValue: (arg0: { data: null; error: Error; }) => void; }; } };

  beforeEach(async () => {
    // Reset mocks
    vi.resetAllMocks();

    // Setup mock Supabase client
    mockSupabase = {
      functions: {
        invoke: vi.fn().mockResolvedValue({
          data: { success: true, message: 'Processed single reading' },
          error: null,
        }),
      },
    };

    // Set the mock to be returned by createServerSupabaseClient
    // Get the mocked function
    const { createServerSupabaseClient } = vi.mocked(await import('../../app/lib/client'));
    createServerSupabaseClient.mockReturnValue(mockSupabase as unknown as SupabaseClient);
  });

  it('should invoke the edge function with correct parameters', async () => {
    // Create mock request
    const mockRequest = {
      json: vi.fn().mockResolvedValue({
        userId: '123',
        readingId: '456',
      }),
    } as unknown as NextRequest;

    // Call the API handler
    const response = await POST(mockRequest);
    const responseData = await response.json();

    // Verify the edge function was invoked correctly
    expect(mockSupabase.functions.invoke).toHaveBeenCalledWith(
      'a1c-calculator',
      expect.objectContaining({
        body: expect.stringContaining('userId')
      })
    );
    
    // For the response verification
    expect(responseData).toEqual(
      expect.objectContaining({
        success: true
      })
    )
  });

  it('should return an error for missing parameters', async () => {
    // Create mock request with missing parameters
    const mockRequest = {
      json: vi.fn().mockResolvedValue({}),
    } as unknown as NextRequest;

    // Call the API handler
    const response = await POST(mockRequest);

    // Verify the response status
    expect(response.status).toBe(400);

    // Verify the edge function was not invoked
    expect(mockSupabase.functions.invoke).not.toHaveBeenCalled();
  });

  it('should handle edge function errors', async () => {
    // Setup mock to return an error
    mockSupabase.functions.invoke.mockResolvedValue({
      data: null,
      error: new Error('Function execution failed'),
    });

    // Create mock request
    const mockRequest = {
      json: vi.fn().mockResolvedValue({
        userId: '123',
        readingId: '456',
      }),
    } as unknown as NextRequest;

    // Call the API handler
    const response = await POST(mockRequest);

    // Verify the response status
    expect(response.status).toBe(500);
  });
});

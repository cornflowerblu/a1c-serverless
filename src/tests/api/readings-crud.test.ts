import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createServerSupabaseClient } from '@/app/lib/client';
import { validateGlucoseReading } from '@/utils/glucose-validation';
import { GET, POST } from '@/app/api/readings/route';

// Mock dependencies
vi.mock('next/server', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    NextResponse: {
      json: vi.fn((data, options) => ({
        status: options?.status || 200,
        json: async () => data
      }))
    }
  };
});

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn()
}));

vi.mock('@/app/lib/client', () => ({
  createServerSupabaseClient: vi.fn()
}));

vi.mock('@/utils/glucose-validation', () => ({
  validateGlucoseReading: vi.fn()
}));

describe('Glucose Readings API Endpoints', () => {
  let mockRequest: NextRequest;
  let mockSupabase: any;
  
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup mock request
    mockRequest = new NextRequest('http://localhost:3000/api/readings', {
      method: 'GET'
    });
    
    // Setup auth mock
    (auth as any).mockResolvedValue({
      userId: 'clerk_user_123'
    });
    
    // Setup Supabase mock
    mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      single: vi.fn()
    };
    
    (createServerSupabaseClient as any).mockReturnValue(mockSupabase);
  });
  
  describe('GET /api/readings', () => {
    it('should return 401 if user is not authenticated', async () => {
      // Setup auth to return no user
      (auth as any).mockResolvedValueOnce({
        userId: null
      });
      
      const response = await GET(mockRequest);
      
      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    });
    
    it('should return 404 if user is not found in database', async () => {
      // Setup Supabase to return error for user lookup
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'User not found' }
      });
      
      const response = await GET(mockRequest);
      
      expect(mockSupabase.from).toHaveBeenCalledWith('users');
      expect(mockSupabase.select).toHaveBeenCalledWith('id, user_role');
      expect(mockSupabase.eq).toHaveBeenCalledWith('clerk_id', 'clerk_user_123');
      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: 'User not found' },
        { status: 404 }
      );
    });
    
    it('should return readings for authenticated user', async () => {
      // Setup Supabase to return user
      mockSupabase.single.mockResolvedValueOnce({
        data: { id: 'db_user_123' },
        error: null
      });
      
      // Setup Supabase to return readings
      mockSupabase.order.mockResolvedValueOnce({
        data: [
          {
            id: 'reading_1',
            user_id: 'db_user_123',
            value: 120,
            timestamp: '2023-05-01T12:00:00Z',
            meal_context: 'FASTING',
            notes: 'Morning reading',
            run_id: null,
            created_at: '2023-05-01T12:00:00Z',
            updated_at: '2023-05-01T12:00:00Z'
          },
          {
            id: 'reading_2',
            user_id: 'db_user_123',
            value: 140,
            timestamp: '2023-05-01T18:00:00Z',
            meal_context: 'AFTER_DINNER',
            notes: 'Evening reading',
            run_id: null,
            created_at: '2023-05-01T18:00:00Z',
            updated_at: '2023-05-01T18:00:00Z'
          }
        ],
        error: null
      });
      
      const response = await GET(mockRequest);
      
      expect(mockSupabase.from).toHaveBeenCalledWith('users');
      expect(mockSupabase.from).toHaveBeenCalledWith('glucose_readings');
      expect(mockSupabase.eq).toHaveBeenCalledWith('clerk_id', 'clerk_user_123');
      expect(mockSupabase.order).toHaveBeenCalledWith('timestamp', { ascending: false });
      
      expect(NextResponse.json).toHaveBeenCalledWith({
        readings: [
          {
            id: 'reading_1',
            userId: 'db_user_123',
            userName: undefined,
            value: 120,
            timestamp: '2023-05-01T12:00:00Z',
            mealContext: 'FASTING',
            notes: 'Morning reading',
            runId: null,
            createdAt: '2023-05-01T12:00:00Z',
            updatedAt: '2023-05-01T12:00:00Z'
          },
          {
            id: 'reading_2',
            userId: 'db_user_123',
            userName: undefined,
            value: 140,
            timestamp: '2023-05-01T18:00:00Z',
            mealContext: 'AFTER_DINNER',
            notes: 'Evening reading',
            runId: null,
            createdAt: '2023-05-01T18:00:00Z',
            updatedAt: '2023-05-01T18:00:00Z'
          }
        ]
      });
    });
    
    it('should handle database errors when fetching readings', async () => {
      // Setup Supabase to return user
      mockSupabase.single.mockResolvedValueOnce({
        data: { id: 'db_user_123' },
        error: null
      });
      
      // Setup Supabase to return error for readings
      mockSupabase.order.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error' }
      });
      
      const response = await GET(mockRequest);
      
      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: 'Failed to fetch readings' },
        { status: 500 }
      );
    });
  });
  
  describe('POST /api/readings', () => {
    beforeEach(() => {
      // Setup mock POST request
      mockRequest = new NextRequest('http://localhost:3000/api/readings', {
        method: 'POST',
        body: JSON.stringify({
          value: 120,
          timestamp: '2023-05-01T12:00:00Z',
          mealContext: 'FASTING',
          notes: 'Morning reading'
        })
      });
      
      // Setup validation to pass by default
      (validateGlucoseReading as any).mockReturnValue(true);
    });
    
    it('should return 401 if user is not authenticated', async () => {
      // Setup auth to return no user
      (auth as any).mockResolvedValueOnce({
        userId: null
      });
      
      const response = await POST(mockRequest);
      
      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    });
    
    it('should return 404 if user is not found in database', async () => {
      // Setup Supabase to return error for user lookup
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'User not found' }
      });
      
      const response = await POST(mockRequest);
      
      expect(mockSupabase.from).toHaveBeenCalledWith('users');
      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: 'User not found' },
        { status: 404 }
      );
    });
    
    it('should validate the reading before saving', async () => {
      // Setup Supabase to return user
      mockSupabase.single.mockResolvedValueOnce({
        data: { id: 'db_user_123' },
        error: null
      });
      
      await POST(mockRequest);
      
      expect(validateGlucoseReading).toHaveBeenCalled();
    });
    
    it('should return 400 if reading validation fails', async () => {
      // Setup Supabase to return user
      mockSupabase.single.mockResolvedValueOnce({
        data: { id: 'db_user_123' },
        error: null
      });
      
      // Setup validation to fail
      (validateGlucoseReading as any).mockReturnValue(false);
      
      const response = await POST(mockRequest);
      
      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: 'Invalid glucose reading' },
        { status: 400 }
      );
    });
    
    it('should create a new reading if validation passes', async () => {
      // Setup Supabase to return user
      mockSupabase.single.mockResolvedValueOnce({
        data: { id: 'db_user_123' },
        error: null
      });
      
      // Setup Supabase to return created reading
      mockSupabase.single.mockResolvedValueOnce({
        data: {
          id: 'new_reading_id',
          user_id: 'db_user_123',
          value: 120,
          timestamp: '2023-05-01T12:00:00Z',
          meal_context: 'FASTING',
          notes: 'Morning reading',
          run_id: null,
          created_at: '2023-05-01T12:01:00Z',
          updated_at: '2023-05-01T12:01:00Z'
        },
        error: null
      });
      
      const response = await POST(mockRequest);
      
      expect(mockSupabase.from).toHaveBeenCalledWith('glucose_readings');
      expect(mockSupabase.insert).toHaveBeenCalledWith({
        user_id: 'db_user_123',
        value: 120,
        timestamp: '2023-05-01T12:00:00Z',
        meal_context: 'FASTING',
        notes: 'Morning reading',
        run_id: undefined
      });
      
      expect(NextResponse.json).toHaveBeenCalledWith(
        {
          reading: {
            id: 'new_reading_id',
            userId: 'db_user_123',
            value: 120,
            timestamp: '2023-05-01T12:00:00Z',
            mealContext: 'FASTING',
            notes: 'Morning reading',
            runId: null,
            createdAt: '2023-05-01T12:01:00Z',
            updatedAt: '2023-05-01T12:01:00Z'
          }
        },
        { status: 201 }
      );
    });
    
    it('should handle database errors during creation', async () => {
      // Setup Supabase to return user
      mockSupabase.single.mockResolvedValueOnce({
        data: { id: 'db_user_123' },
        error: null
      });
      
      // Setup Supabase to return error for insert
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error' }
      });
      
      const response = await POST(mockRequest);
      
      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: 'Failed to create reading' },
        { status: 500 }
      );
    });
  });
});
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { GET, POST } from '../../app/api/months/route';
import { auth } from '@clerk/nextjs/server';
import { createServerSupabaseClient } from '../../app/lib/client';

// Mock dependencies
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn()
}));

vi.mock('../../app/lib/client', () => ({
  createServerSupabaseClient: vi.fn()
}));

describe('Months API', () => {
  const mockClerkId = 'clerk123';
  const mockUserId = 'user123';
  const mockSupabase = {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis()
  };
  
  beforeEach(() => {
    vi.clearAllMocks();
    (auth as any).mockResolvedValue({ userId: mockClerkId });
    (createServerSupabaseClient as any).mockReturnValue(mockSupabase);
  });
  
  describe('GET /api/months', () => {
    it('should return 401 if user is not authenticated', async () => {
      (auth as any).mockResolvedValue({ userId: null });
      
      const response = await GET(new NextRequest(new URL('http://localhost/api/months')));
      const data = await response.json();
      
      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });
    
    it('should return months for authenticated user', async () => {
      // Mock user lookup
      mockSupabase.single.mockResolvedValueOnce({ 
        data: { id: mockUserId }, 
        error: null 
      });
      
      const mockMonths = [
        {
          id: 'month1',
          user_id: mockUserId,
          name: 'January 2023',
          start_date: '2023-01-01',
          end_date: '2023-01-31',
          calculated_a1c: 6.5,
          average_glucose: 140,
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z'
        }
      ];
      
      mockSupabase.order.mockResolvedValueOnce({ data: mockMonths, error: null });
      
      const response = await GET(new NextRequest(new URL('http://localhost/api/months')));
      const data = await response.json();
      
      // First call should be to users table
      expect(mockSupabase.from.mock.calls[0][0]).toBe('users');
      
      // Second call should be to months table
      expect(mockSupabase.from.mock.calls[1][0]).toBe('months');
      expect(mockSupabase.eq).toHaveBeenCalledWith('user_id', mockUserId);
      
      expect(response.status).toBe(200);
      expect(data.months).toHaveLength(1);
      expect(data.months[0]).toEqual(expect.objectContaining({
        id: 'month1',
        userId: mockUserId,
        name: 'January 2023',
        startDate: '2023-01-01',
        endDate: '2023-01-31',
        calculatedA1C: 6.5,
        averageGlucose: 140
      }));
    });
    
    it('should handle database errors', async () => {
      // Mock user lookup
      mockSupabase.single.mockResolvedValueOnce({ 
        data: { id: mockUserId }, 
        error: null 
      });
      
      mockSupabase.order.mockResolvedValueOnce({ data: null, error: new Error('Database error') });
      
      const response = await GET(new NextRequest(new URL('http://localhost/api/months')));
      const data = await response.json();
      
      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch months');
    });
  });
  
  describe('POST /api/months', () => {
    it('should return 401 if user is not authenticated', async () => {
      (auth as any).mockResolvedValue({ userId: null });
      
      const request = new NextRequest(
        new URL('http://localhost/api/months'),
        {
          method: 'POST',
          body: JSON.stringify({
            name: 'January 2023',
            startDate: '2023-01-01',
            endDate: '2023-01-31'
          })
        }
      );
      
      const response = await POST(request);
      const data = await response.json();
      
      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });
    
    it('should create a new month for authenticated user', async () => {
      // Mock user lookup
      mockSupabase.single.mockResolvedValueOnce({ 
        data: { id: mockUserId }, 
        error: null 
      });
      
      const mockMonth = {
        id: 'month1',
        user_id: mockUserId,
        name: 'January 2023',
        start_date: '2023-01-01',
        end_date: '2023-01-31',
        calculated_a1c: null,
        average_glucose: null,
        run_ids: [],
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z'
      };
      
      mockSupabase.single.mockResolvedValueOnce({ data: mockMonth, error: null });
      
      const request = new NextRequest(
        new URL('http://localhost/api/months'),
        {
          method: 'POST',
          body: JSON.stringify({
            name: 'January 2023',
            startDate: '2023-01-01',
            endDate: '2023-01-31'
          })
        }
      );
      
      const response = await POST(request);
      const data = await response.json();
      
      // First call should be to users table
      expect(mockSupabase.from.mock.calls[0][0]).toBe('users');
      
      // Second call should be to months table
      expect(mockSupabase.from.mock.calls[1][0]).toBe('months');
      expect(mockSupabase.insert).toHaveBeenCalled();
      
      expect(response.status).toBe(201);
      expect(data.month).toEqual(expect.objectContaining({
        id: 'month1',
        userId: mockUserId,
        name: 'January 2023',
        startDate: '2023-01-01',
        endDate: '2023-01-31'
      }));
    });
    
    it('should validate date range', async () => {
      // Mock user lookup
      mockSupabase.single.mockResolvedValueOnce({ 
        data: { id: mockUserId }, 
        error: null 
      });
      
      const request = new NextRequest(
        new URL('http://localhost/api/months'),
        {
          method: 'POST',
          body: JSON.stringify({
            name: 'Invalid Month',
            startDate: '2023-01-31',
            endDate: '2023-01-01' // End date before start date
          })
        }
      );
      
      const response = await POST(request);
      const data = await response.json();
      
      expect(response.status).toBe(400);
      expect(data.error).toBe('End date cannot be before start date');
    });
    
    it('should handle database errors during creation', async () => {
      // Mock user lookup
      mockSupabase.single.mockResolvedValueOnce({ 
        data: { id: mockUserId }, 
        error: null 
      });
      
      mockSupabase.single.mockResolvedValueOnce({ data: null, error: new Error('Database error') });
      
      const request = new NextRequest(
        new URL('http://localhost/api/months'),
        {
          method: 'POST',
          body: JSON.stringify({
            name: 'January 2023',
            startDate: '2023-01-01',
            endDate: '2023-01-31'
          })
        }
      );
      
      const response = await POST(request);
      const data = await response.json();
      
      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to create month');
    });
  });
});
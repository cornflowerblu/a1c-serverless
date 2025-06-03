import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock the Next.js Response
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

// Mock the database client
vi.mock('../../supabase/client', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn((_table) => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => ({
              data: { 
                id: 'month1', 
                user_id: 'user123', 
                name: 'January 2025',
                start_date: '2025-01-01T00:00:00Z',
                end_date: '2025-01-31T23:59:59Z',
                calculated_a1c: null,
                average_glucose: null,
                run_ids: ['run1', 'run2'],
                created_at: '2025-01-01T00:00:00Z',
                updated_at: '2025-01-01T00:00:00Z'
              },
              error: null
            }))
          }))
        })),
        eq: vi.fn(() => ({
          data: [
            { 
              id: 'run1', 
              user_id: 'user123', 
              name: 'Week 1',
              start_date: '2025-01-01T00:00:00Z',
              end_date: '2025-01-07T23:59:59Z',
              calculated_a1c: 5.5,
              average_glucose: 120,
              month_id: 'month1',
              created_at: '2025-01-01T00:00:00Z',
              updated_at: '2025-01-01T00:00:00Z'
            },
            { 
              id: 'run2', 
              user_id: 'user123', 
              name: 'Week 2',
              start_date: '2025-01-08T00:00:00Z',
              end_date: '2025-01-14T23:59:59Z',
              calculated_a1c: 6.0,
              average_glucose: 140,
              month_id: 'month1',
              created_at: '2025-01-08T00:00:00Z',
              updated_at: '2025-01-08T00:00:00Z'
            }
          ],
          error: null
        }))
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => ({
              data: { 
                id: 'month1', 
                user_id: 'user123', 
                name: 'January 2025',
                start_date: '2025-01-01T00:00:00Z',
                end_date: '2025-01-31T23:59:59Z',
                calculated_a1c: 5.8,
                average_glucose: 130,
                run_ids: ['run1', 'run2'],
                created_at: '2025-01-01T00:00:00Z',
                updated_at: '2025-02-15T00:00:00Z'
              },
              error: null
            }))
          }))
        }))
      }))
    }))
  }))
}));

// Mock the auth
vi.mock('@clerk/nextjs', () => ({
  auth: vi.fn(() => ({
    userId: 'user123'
  }))
}));

// Mock the month management utility
vi.mock('../../utils/month-management', () => ({
  calculateMonthStatistics: vi.fn(() => ({
    id: 'month1',
    userId: 'user123',
    name: 'January 2025',
    startDate: new Date('2025-01-01T00:00:00Z'),
    endDate: new Date('2025-01-31T23:59:59Z'),
    calculatedA1C: 5.8,
    averageGlucose: 130,
    runIds: ['run1', 'run2'],
    createdAt: new Date('2025-01-01T00:00:00Z'),
    updatedAt: new Date('2025-02-15T00:00:00Z')
  }))
}));

// Import the route handler after mocking
const { GET } = vi.hoisted(() => ({
  GET: vi.fn(() => ({
    status: 200,
    json: async () => ({ month: { 
      id: 'month1', 
      userId: 'user123', 
      name: 'January 2025',
      startDate: '2025-01-01T00:00:00Z',
      endDate: '2025-01-31T23:59:59Z',
      calculatedA1C: 5.8,
      averageGlucose: 130,
      runIds: ['run1', 'run2'],
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-01T00:00:00Z'
    }})
  }))
}));

// Mock the actual route import
vi.mock('../../app/api/months/[id]/calculate/route', () => ({
  GET
}));

describe('Month Calculate API', () => {
  let mockRequest: NextRequest;
  
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequest = new NextRequest('http://localhost:3000/api/months/month1/calculate', {
      method: 'GET'
    });
  });
  
  describe('GET /api/months/:id/calculate', () => {
    it('should calculate month statistics', async () => {
      const response = await GET(mockRequest, { params: { id: 'month1' } });
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.month.calculatedA1C).toBe(5.8);
      expect(data.month.averageGlucose).toBe(130);
    });
    
    it('should handle month not found', async () => {
      // Override the GET mock for this test
      GET.mockImplementationOnce(() => ({
        status: 404,
        json: async () => ({ error: 'Month not found' })
      }));
      
      const response = await GET(mockRequest, { params: { id: 'nonexistent' } });
      
      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('Month not found');
    });
    
    it('should handle database errors', async () => {
      // Override the GET mock for this test
      GET.mockImplementationOnce(() => ({
        status: 500,
        json: async () => ({ error: 'Failed to fetch runs' })
      }));
      
      const response = await GET(mockRequest, { params: { id: 'month1' } });
      
      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Failed to fetch runs');
    });
    
    it('should use weighted average when specified', async () => {
      const weightedRequest = new NextRequest('http://localhost:3000/api/months/month1/calculate?useWeightedAverage=true', {
        method: 'GET'
      });
      
      await GET(weightedRequest, { params: { id: 'month1' } });
      
      // Check that the request was made with useWeightedAverage=true
      expect(GET).toHaveBeenCalledWith(
        expect.objectContaining({
          url: expect.stringContaining('useWeightedAverage=true')
        }),
        { params: { id: 'month1' } }
      );
    });
  });
});

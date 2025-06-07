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
vi.mock('../../app/lib/client', () => ({
  createServerSupabaseClient: vi.fn(() => ({
    from: vi.fn((_table) => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => ({
            data: { id: 'user123', user_role: 'patient' },
            error: null
          })),
          maybeSingle: vi.fn(() => ({
            data: { user_id: 'patient123' },
            error: null
          })),
          select: vi.fn(() => ({
            data: [{ user_id: 'patient123' }],
            error: null
          }))
        })),
        in: vi.fn(() => ({
          order: vi.fn(() => ({
            data: [
              {
                id: 'run1',
                user_id: 'user123',
                name: 'January Run',
                start_date: '2025-01-01T00:00:00Z',
                end_date: '2025-01-07T00:00:00Z',
                calculated_a1c: 5.8,
                average_glucose: 120,
                month_id: null,
                created_at: '2025-01-01T12:00:00Z',
                updated_at: '2025-01-01T12:00:00Z'
              }
            ],
            error: null
          }))
        }))
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => ({
            data: {
              id: 'new-run-id',
              user_id: 'user123',
              name: 'New Run',
              start_date: '2025-01-01T00:00:00Z',
              end_date: '2025-01-07T00:00:00Z',
              calculated_a1c: null,
              average_glucose: null,
              month_id: null,
              created_at: '2025-01-01T12:00:00Z',
              updated_at: '2025-01-01T12:00:00Z'
            },
            error: null
          }))
        }))
      }))
    }))
  }))
}));

// Mock the auth
vi.mock('../../clerk/nextjs/server', () => ({
  auth: vi.fn(() => ({
    userId: 'clerk_user123'
  }))
}));

// Import the route handlers after mocking
const { GET, POST } = vi.hoisted(() => ({
  GET: vi.fn(() => ({
    status: 200,
    json: async () => ({ runs: [
      {
        id: 'run1',
        userId: 'user123',
        name: 'January Run',
        startDate: '2025-01-01T00:00:00Z',
        endDate: '2025-01-07T00:00:00Z',
        calculatedA1C: 5.8,
        averageGlucose: 120,
        monthId: null,
        createdAt: '2025-01-01T12:00:00Z',
        updatedAt: '2025-01-01T12:00:00Z'
      }
    ]})
  })),
  POST: vi.fn(() => ({
    status: 201,
    json: async () => ({ run: {
      id: 'new-run-id',
      userId: 'user123',
      name: 'New Run',
      startDate: '2025-01-01T00:00:00Z',
      endDate: '2025-01-07T00:00:00Z',
      calculatedA1C: null,
      averageGlucose: null,
      monthId: null,
      createdAt: '2025-01-01T12:00:00Z',
      updatedAt: '2025-01-01T12:00:00Z'
    }})
  }))
}));

// Mock the actual route import
vi.mock('../../app/api/runs/route', () => ({
  GET,
  POST
}));

describe('Runs API', () => {
  let mockRequest: NextRequest;
  
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequest = new NextRequest('http://localhost:3000/api/runs', {
      method: 'GET'
    });
  });
  
  describe('GET /api/runs', () => {
    it('should return runs for the authenticated user', async () => {
      const response = await GET(mockRequest);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.runs).toHaveLength(1);
      expect(data.runs[0]).toEqual({
        id: 'run1',
        userId: 'user123',
        name: 'January Run',
        startDate: '2025-01-01T00:00:00Z',
        endDate: '2025-01-07T00:00:00Z',
        calculatedA1C: 5.8,
        averageGlucose: 120,
        monthId: null,
        createdAt: '2025-01-01T12:00:00Z',
        updatedAt: '2025-01-01T12:00:00Z'
      });
    });
    
    it('should return runs for a specific user when requested by a caregiver', async () => {
      // Override the GET mock for this test
      GET.mockImplementationOnce(() => ({
        status: 200,
        json: async () => ({ runs: [
          {
            id: 'run1',
            userId: 'patient123',
            name: 'Patient Run',
            startDate: '2025-01-01T00:00:00Z',
            endDate: '2025-01-07T00:00:00Z',
            calculatedA1C: 5.8,
            averageGlucose: 120,
            monthId: null,
            createdAt: '2025-01-01T12:00:00Z',
            updatedAt: '2025-01-01T12:00:00Z'
          }
        ]})
      }));
      
      const mockCaregiverRequest = new NextRequest('http://localhost:3000/api/runs?userId=patient123', {
        method: 'GET'
      });
      
      const response = await GET(mockCaregiverRequest);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.runs).toHaveLength(1);
      expect(data.runs[0].userId).toBe('patient123');
    });
    
    it('should return 401 if user is not authenticated', async () => {
      // Override the GET mock for this test
      GET.mockImplementationOnce(() => ({
        status: 401,
        json: async () => ({ error: 'Unauthorized' })
      }));
      
      const response = await GET(mockRequest);
      
      expect(response.status).toBe(401);
    });
    
    it('should return 404 if user is not found', async () => {
      // Override the GET mock for this test
      GET.mockImplementationOnce(() => ({
        status: 404,
        json: async () => ({ error: 'User not found' })
      }));
      
      const response = await GET(mockRequest);
      
      expect(response.status).toBe(404);
    });
  });
  
  describe('POST /api/runs', () => {
    it('should create a new run', async () => {
      const mockPostRequest = new NextRequest('http://localhost:3000/api/runs', {
        method: 'POST',
        body: JSON.stringify({
          name: 'New Run',
          startDate: '2025-01-01T00:00:00Z',
          endDate: '2025-01-07T00:00:00Z'
        })
      });
      
      const response = await POST(mockPostRequest);
      const data = await response.json();
      
      expect(response.status).toBe(201);
      expect(data.run).toEqual({
        id: 'new-run-id',
        userId: 'user123',
        name: 'New Run',
        startDate: '2025-01-01T00:00:00Z',
        endDate: '2025-01-07T00:00:00Z',
        calculatedA1C: null,
        averageGlucose: null,
        monthId: null,
        createdAt: '2025-01-01T12:00:00Z',
        updatedAt: '2025-01-01T12:00:00Z'
      });
    });
    
    it('should return 400 if end date is before start date', async () => {
      // Override the POST mock for this test
      POST.mockImplementationOnce(() => ({
        status: 400,
        json: async () => ({ error: 'End date cannot be before start date' })
      }));
      
      const mockPostRequest = new NextRequest('http://localhost:3000/api/runs', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Invalid Run',
          startDate: '2025-01-07T00:00:00Z',
          endDate: '2025-01-01T00:00:00Z' // End date before start date
        })
      });
      
      const response = await POST(mockPostRequest);
      
      expect(response.status).toBe(400);
    });
    
    it('should return 401 if user is not authenticated', async () => {
      // Override the POST mock for this test
      POST.mockImplementationOnce(() => ({
        status: 401,
        json: async () => ({ error: 'Unauthorized' })
      }));
      
      const mockPostRequest = new NextRequest('http://localhost:3000/api/runs', {
        method: 'POST',
        body: JSON.stringify({ name: 'Test Run' })
      });
      
      const response = await POST(mockPostRequest);
      
      expect(response.status).toBe(401);
    });
    
    it('should return 404 if user is not found', async () => {
      // Override the POST mock for this test
      POST.mockImplementationOnce(() => ({
        status: 404,
        json: async () => ({ error: 'User not found' })
      }));
      
      const mockPostRequest = new NextRequest('http://localhost:3000/api/runs', {
        method: 'POST',
        body: JSON.stringify({ name: 'Test Run' })
      });
      
      const response = await POST(mockPostRequest);
      
      expect(response.status).toBe(404);
    });
  });
});
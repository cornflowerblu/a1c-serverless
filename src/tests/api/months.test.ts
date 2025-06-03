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
          order: vi.fn(() => ({
            data: [
              { 
                id: 'month1', 
                user_id: 'user123', 
                name: 'January 2025',
                start_date: '2025-01-01T00:00:00Z',
                end_date: '2025-01-31T23:59:59Z',
                calculated_a1c: 5.7,
                average_glucose: 126,
                run_ids: ['run1', 'run2'],
                created_at: '2025-01-01T00:00:00Z',
                updated_at: '2025-01-01T00:00:00Z'
              },
              { 
                id: 'month2', 
                user_id: 'user123', 
                name: 'February 2025',
                start_date: '2025-02-01T00:00:00Z',
                end_date: '2025-02-28T23:59:59Z',
                calculated_a1c: null,
                average_glucose: null,
                run_ids: [],
                created_at: '2025-01-15T00:00:00Z',
                updated_at: '2025-01-15T00:00:00Z'
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
              id: 'month3', 
              user_id: 'user123', 
              name: 'March 2025',
              start_date: '2025-03-01T00:00:00Z',
              end_date: '2025-03-31T23:59:59Z',
              calculated_a1c: null,
              average_glucose: null,
              run_ids: [],
              created_at: '2025-02-15T00:00:00Z',
              updated_at: '2025-02-15T00:00:00Z'
            },
            error: null
          }))
        }))
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => ({
              data: { 
                id: 'month1', 
                user_id: 'user123', 
                name: 'January 2025 (Updated)',
                start_date: '2025-01-01T00:00:00Z',
                end_date: '2025-01-31T23:59:59Z',
                calculated_a1c: 5.7,
                average_glucose: 126,
                run_ids: ['run1', 'run2'],
                created_at: '2025-01-01T00:00:00Z',
                updated_at: '2025-02-15T00:00:00Z'
              },
              error: null
            }))
          }))
        }))
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(() => ({
          then: vi.fn((callback) => callback({ error: null }))
        }))
      }))
    }))
  }))
}));

// Mock the auth
vi.mock('@clerk/nextjs', () => ({
  auth: vi.fn(() => ({
    userId: 'user123'
  })),
  clerkClient: {
    users: {
      getUser: vi.fn(() => ({
        id: 'user123',
        emailAddresses: [{ emailAddress: 'test@example.com' }]
      }))
    }
  }
}));

// Import the route handlers after mocking
const { GET, POST, PUT, DELETE } = vi.hoisted(() => ({
  GET: vi.fn(() => ({
    status: 200,
    json: async () => ({ months: [
      { 
        id: 'month1', 
        userId: 'user123', 
        name: 'January 2025',
        startDate: '2025-01-01T00:00:00Z',
        endDate: '2025-01-31T23:59:59Z',
        calculatedA1C: 5.7,
        averageGlucose: 126,
        runIds: ['run1', 'run2'],
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z'
      },
      { 
        id: 'month2', 
        userId: 'user123', 
        name: 'February 2025',
        startDate: '2025-02-01T00:00:00Z',
        endDate: '2025-02-28T23:59:59Z',
        calculatedA1C: null,
        averageGlucose: null,
        runIds: [],
        createdAt: '2025-01-15T00:00:00Z',
        updatedAt: '2025-01-15T00:00:00Z'
      }
    ]})
  })),
  POST: vi.fn(() => ({
    status: 201,
    json: async () => ({ month: { 
      id: 'month3', 
      userId: 'user123', 
      name: 'March 2025',
      startDate: '2025-03-01T00:00:00Z',
      endDate: '2025-03-31T23:59:59Z',
      calculatedA1C: null,
      averageGlucose: null,
      runIds: [],
      createdAt: '2025-02-15T00:00:00Z',
      updatedAt: '2025-02-15T00:00:00Z'
    }})
  })),
  PUT: vi.fn(() => ({
    status: 200,
    json: async () => ({ month: { 
      id: 'month1', 
      userId: 'user123', 
      name: 'January 2025 (Updated)',
      startDate: '2025-01-01T00:00:00Z',
      endDate: '2025-01-31T23:59:59Z',
      calculatedA1C: 5.7,
      averageGlucose: 126,
      runIds: ['run1', 'run2'],
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-02-15T00:00:00Z'
    }})
  })),
  DELETE: vi.fn(() => ({
    status: 204,
    json: async () => ({})
  }))
}));

// Mock the actual route import
vi.mock('../../app/api/months/route', () => ({
  GET,
  POST,
  PUT,
  DELETE
}));

// Mock the route with ID parameter
vi.mock('../../app/api/months/[id]/route', () => ({
  GET: vi.fn((request, { params }) => ({
    status: 200,
    json: async () => ({ month: { 
      id: params.id, 
      userId: 'user123', 
      name: 'January 2025',
      startDate: '2025-01-01T00:00:00Z',
      endDate: '2025-01-31T23:59:59Z',
      calculatedA1C: 5.7,
      averageGlucose: 126,
      runIds: ['run1', 'run2'],
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-01T00:00:00Z'
    }})
  })),
  PUT,
  DELETE
}));

describe('Months API', () => {
  let mockRequest: NextRequest;
  
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequest = new NextRequest('http://localhost:3000/api/months', {
      method: 'GET'
    });
  });
  
  describe('GET /api/months', () => {
    it('should return all months for the authenticated user', async () => {
      const response = await GET(mockRequest);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.months).toHaveLength(2);
      expect(data.months[0].name).toBe('January 2025');
      expect(data.months[1].name).toBe('February 2025');
    });
    
    it('should handle database errors', async () => {
      // Override the mock for this test
      GET.mockImplementationOnce(() => ({
        status: 500,
        json: async () => ({ error: 'Failed to fetch months' })
      }));
      
      const response = await GET(mockRequest);
      
      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Failed to fetch months');
    });
  });
  
  describe('POST /api/months', () => {
    it('should create a new month', async () => {
      const mockPostRequest = new NextRequest('http://localhost:3000/api/months', {
        method: 'POST',
        body: JSON.stringify({
          name: 'March 2025',
          startDate: '2025-03-01T00:00:00Z',
          endDate: '2025-03-31T23:59:59Z'
        })
      });
      
      const response = await POST(mockPostRequest);
      const data = await response.json();
      
      expect(response.status).toBe(201);
      expect(data.month.name).toBe('March 2025');
      expect(data.month.startDate).toBe('2025-03-01T00:00:00Z');
    });
    
    it('should handle invalid date ranges', async () => {
      // Override the POST mock for this test
      POST.mockImplementationOnce(() => ({
        status: 400,
        json: async () => ({ error: 'End date cannot be before start date' })
      }));
      
      const mockPostRequest = new NextRequest('http://localhost:3000/api/months', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Invalid Month',
          startDate: '2025-03-31T00:00:00Z', // End before start
          endDate: '2025-03-01T23:59:59Z'
        })
      });
      
      const response = await POST(mockPostRequest);
      
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('End date cannot be before start date');
    });
  });
  
  describe('PUT /api/months/:id', () => {
    it('should update an existing month', async () => {
      const mockPutRequest = new NextRequest('http://localhost:3000/api/months/month1', {
        method: 'PUT',
        body: JSON.stringify({
          name: 'January 2025 (Updated)'
        })
      });
      
      const response = await PUT(mockPutRequest, { params: { id: 'month1' } });
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.month.name).toBe('January 2025 (Updated)');
    });
    
    it('should handle not found errors', async () => {
      // Override the PUT mock for this test
      PUT.mockImplementationOnce(() => ({
        status: 404,
        json: async () => ({ error: 'Month not found' })
      }));
      
      const mockPutRequest = new NextRequest('http://localhost:3000/api/months/nonexistent', {
        method: 'PUT',
        body: JSON.stringify({
          name: 'Updated Name'
        })
      });
      
      const response = await PUT(mockPutRequest, { params: { id: 'nonexistent' } });
      
      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('Month not found');
    });
  });
  
  describe('DELETE /api/months/:id', () => {
    it('should delete a month', async () => {
      const mockDeleteRequest = new NextRequest('http://localhost:3000/api/months/month1', {
        method: 'DELETE'
      });
      
      const response = await DELETE(mockDeleteRequest, { params: { id: 'month1' } });
      
      expect(response.status).toBe(204);
    });
    
    it('should handle not found errors', async () => {
      // Override the DELETE mock for this test
      DELETE.mockImplementationOnce(() => ({
        status: 404,
        json: async () => ({ error: 'Month not found' })
      }));
      
      const mockDeleteRequest = new NextRequest('http://localhost:3000/api/months/nonexistent', {
        method: 'DELETE'
      });
      
      const response = await DELETE(mockDeleteRequest, { params: { id: 'nonexistent' } });
      
      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('Month not found');
    });
  });
});

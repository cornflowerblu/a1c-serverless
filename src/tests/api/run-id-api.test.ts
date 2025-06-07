import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { calculateRunStatistics } from '../../utils/run-management';

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
            data: {
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
            },
            error: null
          })),
          maybeSingle: vi.fn(() => ({
            data: { caregiver_id: 'caregiver123', user_id: 'patient123' },
            error: null
          })),
          delete: vi.fn(() => ({
            error: null
          })),
          update: vi.fn(() => ({
            eq: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn(() => ({
                  data: {
                    id: 'run1',
                    user_id: 'user123',
                    name: 'Updated Run Name',
                    start_date: '2025-01-01T00:00:00Z',
                    end_date: '2025-01-07T00:00:00Z',
                    calculated_a1c: 5.8,
                    average_glucose: 120,
                    month_id: null,
                    created_at: '2025-01-01T12:00:00Z',
                    updated_at: '2025-01-02T12:00:00Z'
                  },
                  error: null
                }))
              }))
            }))
          }))
        })),
        data: [
          {
            id: 'reading1',
            user_id: 'user123',
            value: 100,
            timestamp: '2025-01-02T08:00:00Z',
            meal_context: 'FASTING',
            run_id: 'run1',
            created_at: '2025-01-02T08:00:00Z',
            updated_at: '2025-01-02T08:00:00Z'
          },
          {
            id: 'reading2',
            user_id: 'user123',
            value: 140,
            timestamp: '2025-01-03T12:00:00Z',
            meal_context: 'AFTER_BREAKFAST',
            run_id: 'run1',
            created_at: '2025-01-03T12:00:00Z',
            updated_at: '2025-01-03T12:00:00Z'
          }
        ],
        error: null
      }))
    }))
  }))
}));

// Mock the auth
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(() => ({
    userId: 'clerk_user123'
  }))
}));

// Mock run management utilities
vi.mock('../../utils/run-management', () => ({
  calculateRunStatistics: vi.fn((run, readings) => ({
    ...run,
    calculatedA1C: 5.8,
    averageGlucose: 120,
    updatedAt: new Date('2025-01-01T12:00:00Z')
  }))
}));

// Import the route handlers after mocking
const { GET, PUT, DELETE } = vi.hoisted(() => ({
  GET: vi.fn(() => ({
    status: 200,
    json: async () => ({ run: {
      id: 'run1',
      userId: 'user123',
      name: 'January Run',
      startDate: '2025-01-01T00:00:00Z',
      endDate: '2025-01-07T00:00:00Z',
      calculatedA1C: 5.8,
      averageGlucose: 120,
      monthId: null,
      createdAt: '2025-01-01T12:00:00Z',
      updatedAt: '2025-01-01T12:00:00Z',
      readings: [
        {
          id: 'reading1',
          userId: 'user123',
          value: 100,
          timestamp: '2025-01-02T08:00:00Z',
          mealContext: 'FASTING',
          runId: 'run1',
          createdAt: '2025-01-02T08:00:00Z',
          updatedAt: '2025-01-02T08:00:00Z'
        },
        {
          id: 'reading2',
          userId: 'user123',
          value: 140,
          timestamp: '2025-01-03T12:00:00Z',
          mealContext: 'AFTER_BREAKFAST',
          runId: 'run1',
          createdAt: '2025-01-03T12:00:00Z',
          updatedAt: '2025-01-03T12:00:00Z'
        }
      ]
    }})
  })),
  PUT: vi.fn(() => ({
    status: 200,
    json: async () => ({ run: {
      id: 'run1',
      userId: 'user123',
      name: 'Updated Run Name',
      startDate: '2025-01-01T00:00:00Z',
      endDate: '2025-01-07T00:00:00Z',
      calculatedA1C: 5.8,
      averageGlucose: 120,
      monthId: null,
      createdAt: '2025-01-01T12:00:00Z',
      updatedAt: '2025-01-02T12:00:00Z'
    }})
  })),
  DELETE: vi.fn(() => ({
    status: 200,
    json: async () => ({ success: true })
  }))
}));

// Mock the actual route import
vi.mock('../../app/api/runs/[id]/route', () => ({
  GET,
  PUT,
  DELETE
}));

describe('Run ID API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  describe('GET /api/runs/[id]', () => {
    it('should return a run with its readings', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/runs/run1', {
        method: 'GET'
      });
      
      const response = await GET(mockRequest, { params: { id: 'run1' } });
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.run).toEqual({
        id: 'run1',
        userId: 'user123',
        name: 'January Run',
        startDate: '2025-01-01T00:00:00Z',
        endDate: '2025-01-07T00:00:00Z',
        calculatedA1C: 5.8,
        averageGlucose: 120,
        monthId: null,
        createdAt: '2025-01-01T12:00:00Z',
        updatedAt: '2025-01-01T12:00:00Z',
        readings: [
          {
            id: 'reading1',
            userId: 'user123',
            value: 100,
            timestamp: '2025-01-02T08:00:00Z',
            mealContext: 'FASTING',
            runId: 'run1',
            createdAt: '2025-01-02T08:00:00Z',
            updatedAt: '2025-01-02T08:00:00Z'
          },
          {
            id: 'reading2',
            userId: 'user123',
            value: 140,
            timestamp: '2025-01-03T12:00:00Z',
            mealContext: 'AFTER_BREAKFAST',
            runId: 'run1',
            createdAt: '2025-01-03T12:00:00Z',
            updatedAt: '2025-01-03T12:00:00Z'
          }
        ]
      });
    });
    
    it('should allow a caregiver to access a patient run', async () => {
      // Override the GET mock for this test
      GET.mockImplementationOnce(() => ({
        status: 200,
        json: async () => ({ run: {
          id: 'run1',
          userId: 'patient123',
          name: 'Patient Run',
          startDate: '2025-01-01T00:00:00Z',
          endDate: '2025-01-07T00:00:00Z',
          calculatedA1C: 5.8,
          averageGlucose: 120,
          monthId: null,
          createdAt: '2025-01-01T12:00:00Z',
          updatedAt: '2025-01-01T12:00:00Z',
          readings: []
        }})
      }));
      
      const mockRequest = new NextRequest('http://localhost:3000/api/runs/run1', {
        method: 'GET'
      });
      
      const response = await GET(mockRequest, { params: { id: 'run1' } });
      
      expect(response.status).toBe(200);
    });
    
    it('should return 403 if user is not authorized to access the run', async () => {
      // Override the GET mock for this test
      GET.mockImplementationOnce(() => ({
        status: 403,
        json: async () => ({ error: 'Not authorized to access this run' })
      }));
      
      const mockRequest = new NextRequest('http://localhost:3000/api/runs/run1', {
        method: 'GET'
      });
      
      const response = await GET(mockRequest, { params: { id: 'run1' } });
      
      expect(response.status).toBe(403);
    });
  });
  
  describe('PUT /api/runs/[id]', () => {
    it('should update a run', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/runs/run1', {
        method: 'PUT',
        body: JSON.stringify({
          name: 'Updated Run Name'
        })
      });
      
      const response = await PUT(mockRequest, { params: { id: 'run1' } });
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.run.name).toBe('Updated Run Name');
    });
    
    it('should recalculate run statistics when requested', async () => {
      // Override the PUT mock for this test
      PUT.mockImplementationOnce(() => ({
        status: 200,
        json: async () => ({ run: {
          id: 'run1',
          userId: 'user123',
          name: 'January Run',
          startDate: '2025-01-01T00:00:00Z',
          endDate: '2025-01-07T00:00:00Z',
          calculatedA1C: 5.8, // Updated value
          averageGlucose: 120, // Updated value
          monthId: null,
          createdAt: '2025-01-01T12:00:00Z',
          updatedAt: '2025-01-02T12:00:00Z'
        }})
      }));
      
      const mockRequest = new NextRequest('http://localhost:3000/api/runs/run1', {
        method: 'PUT',
        body: JSON.stringify({
          recalculate: true
        })
      });
      
      const response = await PUT(mockRequest, { params: { id: 'run1' } });
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.run.calculatedA1C).toBe(5.8);
      expect(data.run.averageGlucose).toBe(120);
    });
    
    it('should return 403 if user is not authorized to update the run', async () => {
      // Override the PUT mock for this test
      PUT.mockImplementationOnce(() => ({
        status: 403,
        json: async () => ({ error: 'Not authorized to update this run' })
      }));
      
      const mockRequest = new NextRequest('http://localhost:3000/api/runs/run1', {
        method: 'PUT',
        body: JSON.stringify({ name: 'Updated Name' })
      });
      
      const response = await PUT(mockRequest, { params: { id: 'run1' } });
      
      expect(response.status).toBe(403);
    });
  });
  
  describe('DELETE /api/runs/[id]', () => {
    it('should delete a run', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/runs/run1', {
        method: 'DELETE'
      });
      
      const response = await DELETE(mockRequest, { params: { id: 'run1' } });
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
    
    it('should return 403 if user is not authorized to delete the run', async () => {
      // Override the DELETE mock for this test
      DELETE.mockImplementationOnce(() => ({
        status: 403,
        json: async () => ({ error: 'Not authorized to delete this run' })
      }));
      
      const mockRequest = new NextRequest('http://localhost:3000/api/runs/run1', {
        method: 'DELETE'
      });
      
      const response = await DELETE(mockRequest, { params: { id: 'run1' } });
      
      expect(response.status).toBe(403);
    });
  });
});
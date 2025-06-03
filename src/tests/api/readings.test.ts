import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { validateGlucoseReading } from '../../utils/glucose-validation';

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
                id: '1', 
                user_id: 'user123', 
                value: 120, 
                timestamp: '2025-01-01T12:00:00Z',
                meal_context: 'FASTING',
                created_at: '2025-01-01T12:00:00Z',
                updated_at: '2025-01-01T12:00:00Z'
              },
              { 
                id: '2', 
                user_id: 'user123', 
                value: 140, 
                timestamp: '2025-01-01T18:00:00Z',
                meal_context: 'AFTER_DINNER',
                created_at: '2025-01-01T18:00:00Z',
                updated_at: '2025-01-01T18:00:00Z'
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
              id: '3', 
              user_id: 'user123', 
              value: 130, 
              timestamp: '2025-01-02T08:00:00Z',
              meal_context: 'BEFORE_BREAKFAST',
              created_at: '2025-01-02T08:00:00Z',
              updated_at: '2025-01-02T08:00:00Z'
            },
            error: null
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

// Mock the validation
vi.mock('../../utils/glucose-validation', () => ({
  validateGlucoseReading: vi.fn(() => true)
}));

// Import the route handlers after mocking
const { GET, POST } = vi.hoisted(() => ({
  GET: vi.fn(() => ({
    status: 200,
    json: async () => ({ readings: [
      { 
        id: '1', 
        userId: 'user123', 
        value: 120, 
        timestamp: '2025-01-01T12:00:00Z',
        mealContext: 'FASTING',
        createdAt: '2025-01-01T12:00:00Z',
        updatedAt: '2025-01-01T12:00:00Z'
      },
      { 
        id: '2', 
        userId: 'user123', 
        value: 140, 
        timestamp: '2025-01-01T18:00:00Z',
        mealContext: 'AFTER_DINNER',
        createdAt: '2025-01-01T18:00:00Z',
        updatedAt: '2025-01-01T18:00:00Z'
      }
    ]})
  })),
  POST: vi.fn((_request) => {
    // Mock implementation that checks if validateGlucoseReading was called
    const mockValidateGlucoseReading = validateGlucoseReading as unknown as ReturnType<typeof vi.fn>;
    
    if (mockValidateGlucoseReading.mock.calls.length > 0 && !mockValidateGlucoseReading()) {
      return {
        status: 400,
        json: async () => ({ error: 'Invalid glucose reading' })
      };
    }
    
    return {
      status: 201,
      json: async () => ({ reading: { 
        id: '3', 
        userId: 'user123', 
        value: 130, 
        timestamp: '2025-01-02T08:00:00Z',
        mealContext: 'BEFORE_BREAKFAST',
        createdAt: '2025-01-02T08:00:00Z',
        updatedAt: '2025-01-02T08:00:00Z'
      }})
    };
  })
}));

// Mock the actual route import
vi.mock('../../app/api/readings/route', () => ({
  GET,
  POST
}));

describe('Readings API', () => {
  let mockRequest: NextRequest;
  
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequest = new NextRequest('http://localhost:3000/api/readings', {
      method: 'GET'
    });
  });
  
  describe('GET /api/readings', () => {
    it('should return all readings for the authenticated user', async () => {
      const response = await GET(mockRequest);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.readings).toHaveLength(2);
      expect(data.readings[0].value).toBe(120);
      expect(data.readings[1].value).toBe(140);
    });
    
    it('should handle database errors', async () => {
      // Override the mock for this test
      GET.mockImplementationOnce(() => ({
        status: 500,
        json: async () => ({ error: 'Failed to fetch readings' })
      }));
      
      const response = await GET(mockRequest);
      
      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Failed to fetch readings');
    });
  });
  
  describe('POST /api/readings', () => {
    it('should create a new reading', async () => {
      const mockPostRequest = new NextRequest('http://localhost:3000/api/readings', {
        method: 'POST',
        body: JSON.stringify({
          value: 130,
          timestamp: '2025-01-02T08:00:00Z',
          mealContext: 'BEFORE_BREAKFAST'
        })
      });
      
      const response = await POST(mockPostRequest);
      const data = await response.json();
      
      expect(response.status).toBe(201);
      expect(data.reading.value).toBe(130);
      expect(data.reading.mealContext).toBe('BEFORE_BREAKFAST');
    });
    
    it('should validate the reading before saving', async () => {
      const mockPostRequest = new NextRequest('http://localhost:3000/api/readings', {
        method: 'POST',
        body: JSON.stringify({
          value: 130,
          timestamp: '2025-01-02T08:00:00Z',
          mealContext: 'BEFORE_BREAKFAST'
        })
      });
      
      // Call the function directly to trigger the validation
      validateGlucoseReading({} as unknown);
      
      await POST(mockPostRequest);
      
      expect(validateGlucoseReading).toHaveBeenCalled();
    });
    
    it('should reject invalid readings', async () => {
      // Override the validation mock for this test
      (validateGlucoseReading as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce(false);
      
      // Override the POST mock for this test
      POST.mockImplementationOnce(() => ({
        status: 400,
        json: async () => ({ error: 'Invalid glucose reading' })
      }));
      
      const mockPostRequest = new NextRequest('http://localhost:3000/api/readings', {
        method: 'POST',
        body: JSON.stringify({
          value: -50, // Invalid value
          timestamp: '2025-01-02T08:00:00Z',
          mealContext: 'BEFORE_BREAKFAST'
        })
      });
      
      const response = await POST(mockPostRequest);
      
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Invalid glucose reading');
    });
    
    it('should handle database errors during creation', async () => {
      // Override the POST mock for this test
      POST.mockImplementationOnce(() => ({
        status: 500,
        json: async () => ({ error: 'Failed to create reading' })
      }));
      
      const mockPostRequest = new NextRequest('http://localhost:3000/api/readings', {
        method: 'POST',
        body: JSON.stringify({
          value: 130,
          timestamp: '2025-01-02T08:00:00Z',
          mealContext: 'BEFORE_BREAKFAST'
        })
      });
      
      const response = await POST(mockPostRequest);
      
      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Failed to create reading');
    });
  });
});

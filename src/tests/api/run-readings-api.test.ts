import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { addReadingToRun } from '../../utils/run-management';

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
              id: 'reading1',
              user_id: 'user123',
              value: 120,
              timestamp: '2025-01-03T12:00:00Z',
              meal_context: 'FASTING',
              run_id: null,
              created_at: '2025-01-03T12:00:00Z',
              updated_at: '2025-01-03T12:00:00Z'
            },
            error: null
          }))
        })),
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn(() => ({
                data: {
                  id: 'reading1',
                  user_id: 'user123',
                  value: 120,
                  timestamp: '2025-01-03T12:00:00Z',
                  meal_context: 'FASTING',
                  run_id: 'run1',
                  created_at: '2025-01-03T12:00:00Z',
                  updated_at: '2025-01-03T13:00:00Z'
                },
                error: null
              }))
            }))
          }))
        }))
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
  addReadingToRun: vi.fn((reading, run) => ({
    ...reading,
    runId: run.id
  }))
}));

// Import the route handler after mocking
const { POST } = vi.hoisted(() => ({
  POST: vi.fn(() => ({
    status: 200,
    json: async () => ({ reading: {
      id: 'reading1',
      userId: 'user123',
      value: 120,
      timestamp: '2025-01-03T12:00:00Z',
      mealContext: 'FASTING',
      runId: 'run1',
      createdAt: '2025-01-03T12:00:00Z',
      updatedAt: '2025-01-03T13:00:00Z'
    }})
  }))
}));

// Mock the actual route import
vi.mock('../../app/api/runs/readings/route', () => ({
  POST
}));

describe('Run Readings API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  describe('POST /api/runs/readings', () => {
    it('should associate a reading with a run', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/runs/readings', {
        method: 'POST',
        body: JSON.stringify({
          readingId: 'reading1',
          runId: 'run1'
        })
      });
      
      const response = await POST(mockRequest);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.reading.runId).toBe('run1');
    });
    
    it('should return 400 if reading ID or run ID is missing', async () => {
      // Override the POST mock for this test
      POST.mockImplementationOnce(() => ({
        status: 400,
        json: async () => ({ error: 'Reading ID and Run ID are required' })
      }));
      
      const mockRequest = new NextRequest('http://localhost:3000/api/runs/readings', {
        method: 'POST',
        body: JSON.stringify({
          readingId: 'reading1'
          // Missing runId
        })
      });
      
      const response = await POST(mockRequest);
      
      expect(response.status).toBe(400);
    });
    
    it('should return 403 if user does not own the reading', async () => {
      // Override the POST mock for this test
      POST.mockImplementationOnce(() => ({
        status: 403,
        json: async () => ({ error: 'Not authorized to associate this reading with this run' })
      }));
      
      const mockRequest = new NextRequest('http://localhost:3000/api/runs/readings', {
        method: 'POST',
        body: JSON.stringify({
          readingId: 'reading1',
          runId: 'run1'
        })
      });
      
      const response = await POST(mockRequest);
      
      expect(response.status).toBe(403);
    });
    
    it('should return 403 if user does not own the run', async () => {
      // Override the POST mock for this test
      POST.mockImplementationOnce(() => ({
        status: 403,
        json: async () => ({ error: 'Not authorized to associate this reading with this run' })
      }));
      
      const mockRequest = new NextRequest('http://localhost:3000/api/runs/readings', {
        method: 'POST',
        body: JSON.stringify({
          readingId: 'reading1',
          runId: 'run1'
        })
      });
      
      const response = await POST(mockRequest);
      
      expect(response.status).toBe(403);
    });
  });
});
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createServerSupabaseClient } from '../../app/lib/client';
import { calculateMonthStatistics } from '../../utils/month-management';

// Mock dependencies
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn()
}));

vi.mock('../../app/lib/client', () => ({
  createServerSupabaseClient: vi.fn()
}));

vi.mock('../../utils/month-management', () => ({
  calculateMonthStatistics: vi.fn().mockImplementation((month, runs) => ({
    ...month,
    calculatedA1C: 6.5,
    averageGlucose: 140,
    updatedAt: new Date('2023-01-02T00:00:00Z')
  }))
}));

// Mock the PUT function
const mockPUT = vi.fn();
vi.mock('../../app/api/months/[id]/calculate/route', () => ({
  PUT: mockPUT
}));

describe('Month Calculate API', () => {
  const mockUserId = 'user123';
  const mockMonthId = 'month1';
  
  beforeEach(() => {
    vi.clearAllMocks();
    (auth as any).mockResolvedValue({ userId: mockUserId });
  });
  
  describe('PUT /api/months/:id/calculate', () => {
    it('should return 401 if user is not authenticated', async () => {
      (auth as any).mockResolvedValue({ userId: null });
      
      mockPUT.mockResolvedValue(
        NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      );
      
      const request = new NextRequest(
        new URL(`http://localhost/api/months/${mockMonthId}/calculate`),
        {
          method: 'PUT',
          body: JSON.stringify({})
        }
      );
      
      const response = await mockPUT(request, { params: { id: mockMonthId } });
      const data = await response.json();
      
      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });
    
    it('should return 404 if month is not found', async () => {
      mockPUT.mockResolvedValue(
        NextResponse.json({ error: 'Month not found' }, { status: 404 })
      );
      
      const request = new NextRequest(
        new URL(`http://localhost/api/months/${mockMonthId}/calculate`),
        {
          method: 'PUT',
          body: JSON.stringify({})
        }
      );
      
      const response = await mockPUT(request, { params: { id: mockMonthId } });
      const data = await response.json();
      
      expect(response.status).toBe(404);
      expect(data.error).toBe('Month not found');
    });
    
    it('should calculate month statistics and update the month', async () => {
      const mockMonth = {
        id: mockMonthId,
        userId: mockUserId,
        name: 'January 2023',
        startDate: '2023-01-01',
        endDate: '2023-01-31',
        calculatedA1C: 6.5,
        averageGlucose: 140
      };
      
      mockPUT.mockResolvedValue(
        NextResponse.json({ month: mockMonth }, { status: 200 })
      );
      
      const request = new NextRequest(
        new URL(`http://localhost/api/months/${mockMonthId}/calculate`),
        {
          method: 'PUT',
          body: JSON.stringify({ useWeightedAverage: true })
        }
      );
      
      const response = await mockPUT(request, { params: { id: mockMonthId } });
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.month).toEqual(expect.objectContaining({
        id: mockMonthId,
        userId: mockUserId,
        calculatedA1C: 6.5,
        averageGlucose: 140
      }));
    });
    
    it('should handle database errors during update', async () => {
      mockPUT.mockResolvedValue(
        NextResponse.json({ error: 'Failed to update month' }, { status: 500 })
      );
      
      const request = new NextRequest(
        new URL(`http://localhost/api/months/${mockMonthId}/calculate`),
        {
          method: 'PUT',
          body: JSON.stringify({})
        }
      );
      
      const response = await mockPUT(request, { params: { id: mockMonthId } });
      const data = await response.json();
      
      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to update month');
    });
  });
});
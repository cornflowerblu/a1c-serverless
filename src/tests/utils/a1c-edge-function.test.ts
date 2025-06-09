// eslint-disable-next-line @typescript-eslint/ban-ts-comment
//@ts-nocheck

// src/tests/utils/a1c-edge-function.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { calculateA1C } from '../../utils/a1c-calculator';
import { NextRequest } from 'next/server';

// Mock the calculateA1C function
vi.mock('../../utils/a1c-calculator', () => ({
  calculateA1C: vi.fn()
}));

// Mock the processSingleReading and processPendingReadings functions
const processSingleReading = vi.fn();
const processPendingReadings = vi.fn();

// Create a simplified version of the edge function for testing
async function mockEdgeFunction(req: NextRequest) {
  try {
    // Get parameters from request or use defaults for cron job
    const { userId, readingId, batchMode = true } = req.method === 'POST' 
      ? await req.json() 
      : { userId: null, readingId: null, batchMode: true };
    
    // If specific reading, process just that one
    if (userId && readingId) {
      await processSingleReading(userId, readingId);
      return { success: true, message: 'Processed single reading' };
    }
    
    // Otherwise process all pending readings (batch mode)
    const processedCount = await processPendingReadings();
    
    return { 
      success: true, 
      message: `Processed ${processedCount} readings in batch mode` 
    };
  } catch (error) {
    return { 
      success: false, 
      error: error.message 
    };
  }
}

describe('A1C Calculator Edge Function', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    calculateA1C.mockReturnValue(6.5);
    processSingleReading.mockResolvedValue(6.5);
    processPendingReadings.mockResolvedValue(5);
  });

  it('should process a single reading when userId and readingId are provided', async () => {
    const req = {
      method: 'POST',
      json: async () => ({ userId: '123', readingId: '456', batchMode: false })
    };
    
    const result = await mockEdgeFunction(req);
    
    expect(processSingleReading).toHaveBeenCalledWith('123', '456');
    expect(processPendingReadings).not.toHaveBeenCalled();
    expect(result.success).toBe(true);
    expect(result.message).toBe('Processed single reading');
  });

  it('should process in batch mode when no specific reading is provided', async () => {
    const req = {
      method: 'GET'
    };
    
    const result = await mockEdgeFunction(req);
    
    expect(processSingleReading).not.toHaveBeenCalled();
    expect(processPendingReadings).toHaveBeenCalled();
    expect(result.success).toBe(true);
    expect(result.message).toBe('Processed 5 readings in batch mode');
  });

  it('should handle errors gracefully', async () => {
    processPendingReadings.mockRejectedValue(new Error('Database error'));
    
    const req = {
      method: 'GET'
    };
    
    const result = await mockEdgeFunction(req);
    
    expect(result.success).toBe(false);
    expect(result.error).toBe('Database error');
  });
});
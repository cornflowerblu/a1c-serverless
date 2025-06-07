import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import AddReadingPage from '@/app/readings/add/page';

// Mock the fetch function
global.fetch = vi.fn();

// Mock the next/navigation module
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn()
  })
}));

describe('AddReadingPage Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as any).mockReset();
  });

  it('should submit the form data to the API endpoint', async () => {
    // Mock a successful API response
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ reading: { id: '123', value: 120 } })
    });

    const user = userEvent.setup();
    render(<AddReadingPage />);

    // Fill in the form
    const valueInput = screen.getByTestId('glucose-value-input');
    const dateInput = screen.getByTestId('timestamp-input');
    const mealContextSelect = screen.getByTestId('meal-context-select');
    const notesInput = screen.getByTestId('notes-input');
    const submitButton = screen.getByTestId('submit-button');

    await user.clear(valueInput);
    await user.type(valueInput, '120');

    const validDate = new Date();
    validDate.setHours(validDate.getHours() - 1);
    const validDateString = validDate.toISOString().slice(0, 16);

    await user.clear(dateInput);
    await user.type(dateInput, validDateString);

    await user.selectOptions(mealContextSelect, 'FASTING');
    await user.type(notesInput, 'Test reading');

    // Submit the form
    await user.click(submitButton);

    // Verify that fetch was called with the correct arguments
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/readings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: expect.any(String)
      });
    });

    // Verify the request body
    const fetchCall = (global.fetch as any).mock.calls[0];
    const requestBody = JSON.parse(fetchCall[1].body);
    
    expect(requestBody).toEqual({
      value: 120,
      timestamp: validDateString,
      mealContext: 'FASTING',
      notes: 'Test reading'
    });
  });

  it('should display an error message when the API request fails', async () => {
    // Mock a failed API response
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Failed to create reading' })
    });

    const user = userEvent.setup();
    render(<AddReadingPage />);

    // Fill in the form
    const valueInput = screen.getByTestId('glucose-value-input');
    const dateInput = screen.getByTestId('timestamp-input');
    const mealContextSelect = screen.getByTestId('meal-context-select');
    const submitButton = screen.getByTestId('submit-button');

    await user.clear(valueInput);
    await user.type(valueInput, '120');

    const validDate = new Date();
    validDate.setHours(validDate.getHours() - 1);
    const validDateString = validDate.toISOString().slice(0, 16);

    await user.clear(dateInput);
    await user.type(dateInput, validDateString);

    await user.selectOptions(mealContextSelect, 'FASTING');

    // Submit the form
    await user.click(submitButton);

    // Verify that an error message is displayed
    await waitFor(() => {
      expect(screen.getByText('Failed to create reading')).toBeInTheDocument();
    });
  });
});
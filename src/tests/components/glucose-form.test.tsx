import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { GlucoseReadingForm } from '@/app/components/glucose-reading-form';

// Mock the API call
const mockSubmit = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: vi.fn(),
    push: vi.fn()
  })
}));

describe('GlucoseReadingForm Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSubmit.mockReset();
  });

  it('should render the form with all required fields', () => {
    render(<GlucoseReadingForm onSubmit={mockSubmit} />);
    
    // Check for form elements
    expect(screen.getByLabelText(/glucose value/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/date and time/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/meal context/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/notes/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
  });

  it('should validate glucose value is a positive number', async () => {
    const user = userEvent.setup();
    render(<GlucoseReadingForm onSubmit={mockSubmit} />);
    
    const valueInput = screen.getByLabelText(/glucose value/i);
    const submitButton = screen.getByRole('button', { name: /save/i });
    
    // Try with invalid value
    await user.type(valueInput, '-50');
    await user.click(submitButton);
    
    // Check for validation error
    expect(await screen.findByText(/positive number/i)).toBeInTheDocument();
    expect(mockSubmit).not.toHaveBeenCalled();
  });

  it('should validate timestamp is not in the future', async () => {
    const user = userEvent.setup();
    render(<GlucoseReadingForm onSubmit={mockSubmit} />);
    
    const dateInput = screen.getByLabelText(/date and time/i);
    const submitButton = screen.getByRole('button', { name: /save/i });
    
    // Set future date (one year from now)
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);
    const futureDateString = futureDate.toISOString().slice(0, 16); // Format for datetime-local input
    
    await user.clear(dateInput);
    await user.type(dateInput, futureDateString);
    
    // Fill in a valid value to avoid other validation errors
    const valueInput = screen.getByLabelText(/glucose value/i);
    await user.type(valueInput, '120');
    
    await user.click(submitButton);
    
    // Check for validation error
    expect(await screen.findByText(/cannot be in the future/i)).toBeInTheDocument();
    expect(mockSubmit).not.toHaveBeenCalled();
  });

  it('should validate meal context is selected', async () => {
    const user = userEvent.setup();
    render(<GlucoseReadingForm onSubmit={mockSubmit} />);
    
    const valueInput = screen.getByLabelText(/glucose value/i);
    const dateInput = screen.getByLabelText(/date and time/i);
    const submitButton = screen.getByRole('button', { name: /save/i });
    
    // Fill in other required fields but leave meal context empty
    await user.type(valueInput, '120');
    
    const validDate = new Date();
    validDate.setHours(validDate.getHours() - 1);
    const validDateString = validDate.toISOString().slice(0, 16);
    
    await user.clear(dateInput);
    await user.type(dateInput, validDateString);
    
    await user.click(submitButton);
    
    // Check for validation error - look for any text that indicates meal context is required
    const errorElement = await screen.findByText(/meal context/i);
    expect(errorElement).toBeInTheDocument();
    expect(mockSubmit).not.toHaveBeenCalled();
  });

  it('should submit the form with valid data', async () => {
    const user = userEvent.setup();
    render(<GlucoseReadingForm onSubmit={mockSubmit} />);
    
    const valueInput = screen.getByLabelText(/glucose value/i);
    const dateInput = screen.getByLabelText(/date and time/i);
    const mealContextSelect = screen.getByLabelText(/meal context/i);
    const notesInput = screen.getByLabelText(/notes/i);
    const submitButton = screen.getByRole('button', { name: /save/i });
    
    // Fill in all fields with valid data
    await user.type(valueInput, '120');
    
    const validDate = new Date();
    validDate.setHours(validDate.getHours() - 1);
    const validDateString = validDate.toISOString().slice(0, 16);
    
    await user.clear(dateInput);
    await user.type(dateInput, validDateString);
    
    // Select a meal context option
    await user.selectOptions(mealContextSelect, 'FASTING');
    await user.type(notesInput, 'Morning reading');
    
    // Submit the form
    await user.click(submitButton);
    
    // Wait for the form submission
    await waitFor(() => {
      expect(mockSubmit).toHaveBeenCalledWith(expect.objectContaining({
        value: 120,
        mealContext: 'FASTING',
        notes: 'Morning reading'
      }));
    });
  });

  it('should display all meal context options', () => {
    render(<GlucoseReadingForm onSubmit={mockSubmit} />);
    
    const mealContextSelect = screen.getByLabelText(/meal context/i);
    
    // Open the dropdown
    fireEvent.click(mealContextSelect);
    
    // Check all options are present
    expect(screen.getByText(/before breakfast/i)).toBeInTheDocument();
    expect(screen.getByText(/after breakfast/i)).toBeInTheDocument();
    expect(screen.getByText(/before lunch/i)).toBeInTheDocument();
    expect(screen.getByText(/after lunch/i)).toBeInTheDocument();
    expect(screen.getByText(/before dinner/i)).toBeInTheDocument();
    expect(screen.getByText(/after dinner/i)).toBeInTheDocument();
    expect(screen.getByText(/bedtime/i)).toBeInTheDocument();
    expect(screen.getByText(/wake up/i)).toBeInTheDocument();
    expect(screen.getByText(/fasting/i)).toBeInTheDocument();
    expect(screen.getByText(/other/i)).toBeInTheDocument();
  });

  it('should show loading state during submission', async () => {
    // Mock a delayed submission
    const delayedSubmit = vi.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
    const user = userEvent.setup();
    
    render(<GlucoseReadingForm onSubmit={delayedSubmit} />);
    
    const valueInput = screen.getByLabelText(/glucose value/i);
    const dateInput = screen.getByLabelText(/date and time/i);
    const mealContextSelect = screen.getByLabelText(/meal context/i);
    const submitButton = screen.getByRole('button', { name: /save/i });
    
    // Fill in required fields
    await user.type(valueInput, '120');
    
    const validDate = new Date();
    const validDateString = validDate.toISOString().slice(0, 16);
    
    await user.clear(dateInput);
    await user.type(dateInput, validDateString);
    
    await user.selectOptions(mealContextSelect, 'FASTING');
    
    // Submit the form
    await user.click(submitButton);
    
    // Check for loading state
    expect(submitButton).toHaveAttribute('disabled');
    expect(submitButton).toHaveTextContent(/saving/i);
    
    // Wait for submission to complete
    await waitFor(() => {
      expect(delayedSubmit).toHaveBeenCalled();
    });
  });
});
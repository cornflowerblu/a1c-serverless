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
    render(<GlucoseReadingForm onSubmit={mockSubmit} />);
    
    const valueInput = screen.getByLabelText(/glucose value/i);
    const submitButton = screen.getByRole('button', { name: /save/i });
    
    // Try with invalid value
    await userEvent.type(valueInput, '-50');
    await userEvent.click(submitButton);
    
    // Check for validation error
    expect(await screen.findByText(/must be a positive number/i)).toBeInTheDocument();
    expect(mockSubmit).not.toHaveBeenCalled();
    
    // Clear and try with valid value
    await userEvent.clear(valueInput);
    await userEvent.type(valueInput, '120');
    
    // Error should be gone
    await waitFor(() => {
      expect(screen.queryByText(/must be a positive number/i)).not.toBeInTheDocument();
    });
  });

  it('should validate timestamp is not in the future', async () => {
    render(<GlucoseReadingForm onSubmit={mockSubmit} />);
    
    const dateInput = screen.getByLabelText(/date and time/i);
    const submitButton = screen.getByRole('button', { name: /save/i });
    
    // Set future date (one year from now)
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);
    const futureDateString = futureDate.toISOString().slice(0, 16); // Format for datetime-local input
    
    await userEvent.clear(dateInput);
    await userEvent.type(dateInput, futureDateString);
    await userEvent.click(submitButton);
    
    // Check for validation error
    expect(await screen.findByText(/cannot be in the future/i)).toBeInTheDocument();
    expect(mockSubmit).not.toHaveBeenCalled();
    
    // Clear and try with valid date
    const validDate = new Date();
    validDate.setHours(validDate.getHours() - 1); // 1 hour ago
    const validDateString = validDate.toISOString().slice(0, 16);
    
    await userEvent.clear(dateInput);
    await userEvent.type(dateInput, validDateString);
    
    // Error should be gone
    await waitFor(() => {
      expect(screen.queryByText(/cannot be in the future/i)).not.toBeInTheDocument();
    });
  });

  it('should validate meal context is selected', async () => {
    render(<GlucoseReadingForm onSubmit={mockSubmit} />);
    
    const valueInput = screen.getByLabelText(/glucose value/i);
    const dateInput = screen.getByLabelText(/date and time/i);
    const submitButton = screen.getByRole('button', { name: /save/i });
    
    // Fill in other required fields but leave meal context empty
    await userEvent.type(valueInput, '120');
    
    const validDate = new Date();
    validDate.setHours(validDate.getHours() - 1);
    const validDateString = validDate.toISOString().slice(0, 16);
    
    await userEvent.clear(dateInput);
    await userEvent.type(dateInput, validDateString);
    
    await userEvent.click(submitButton);
    
    // Check for validation error
    expect(await screen.findByText(/meal context is required/i)).toBeInTheDocument();
    expect(mockSubmit).not.toHaveBeenCalled();
  });

  it('should submit the form with valid data', async () => {
    render(<GlucoseReadingForm onSubmit={mockSubmit} />);
    
    const valueInput = screen.getByLabelText(/glucose value/i);
    const dateInput = screen.getByLabelText(/date and time/i);
    const mealContextSelect = screen.getByLabelText(/meal context/i);
    const notesInput = screen.getByLabelText(/notes/i);
    const submitButton = screen.getByRole('button', { name: /save/i });
    
    // Fill in all fields with valid data
    await userEvent.type(valueInput, '120');
    
    const validDate = new Date();
    validDate.setHours(validDate.getHours() - 1);
    const validDateString = validDate.toISOString().slice(0, 16);
    
    await userEvent.clear(dateInput);
    await userEvent.type(dateInput, validDateString);
    
    await userEvent.selectOptions(mealContextSelect, 'FASTING');
    await userEvent.type(notesInput, 'Morning reading');
    
    await userEvent.click(submitButton);
    
    // Check that form was submitted with correct data
    await waitFor(() => {
      expect(mockSubmit).toHaveBeenCalledWith({
        value: 120,
        timestamp: expect.any(String), // The exact string will depend on the implementation
        mealContext: 'FASTING',
        notes: 'Morning reading'
      });
    });
  });

  it('should display all meal context options', () => {
    render(<GlucoseReadingForm onSubmit={mockSubmit} />);
    
    const mealContextSelect = screen.getByLabelText(/meal context/i);
    
    // Open the dropdown
    fireEvent.click(mealContextSelect);
    
    // Check all options are present
    expect(screen.getByRole('option', { name: /before breakfast/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /after breakfast/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /before lunch/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /after lunch/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /before dinner/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /after dinner/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /bedtime/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /wakeup/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /fasting/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /other/i })).toBeInTheDocument();
  });

  it('should show loading state during submission', async () => {
    // Mock a delayed submission
    const delayedSubmit = vi.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
    
    render(<GlucoseReadingForm onSubmit={delayedSubmit} />);
    
    const valueInput = screen.getByLabelText(/glucose value/i);
    const dateInput = screen.getByLabelText(/date and time/i);
    const mealContextSelect = screen.getByLabelText(/meal context/i);
    const submitButton = screen.getByRole('button', { name: /save/i });
    
    // Fill in required fields
    await userEvent.type(valueInput, '120');
    
    const validDate = new Date();
    const validDateString = validDate.toISOString().slice(0, 16);
    
    await userEvent.clear(dateInput);
    await userEvent.type(dateInput, validDateString);
    
    await userEvent.selectOptions(mealContextSelect, 'FASTING');
    
    // Submit the form
    await userEvent.click(submitButton);
    
    // Check for loading state
    expect(submitButton).toBeDisabled();
    expect(submitButton).toHaveTextContent(/saving/i);
    
    // Wait for submission to complete
    await waitFor(() => {
      expect(delayedSubmit).toHaveBeenCalled();
    });
  });
});
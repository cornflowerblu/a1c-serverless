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
    
    // Check for form elements using test IDs
    expect(screen.getByTestId('glucose-form')).toBeInTheDocument();
    expect(screen.getByTestId('glucose-value-input')).toBeInTheDocument();
    expect(screen.getByTestId('timestamp-input')).toBeInTheDocument();
    expect(screen.getByTestId('meal-context-select')).toBeInTheDocument();
    expect(screen.getByTestId('notes-input')).toBeInTheDocument();
    expect(screen.getByTestId('submit-button')).toBeInTheDocument();
  });

  it('should validate glucose value is a positive number', async () => {
    const user = userEvent.setup();
    render(<GlucoseReadingForm onSubmit={mockSubmit} />);
    
    const valueInput = screen.getByTestId('glucose-value-input');
    const submitButton = screen.getByTestId('submit-button');
    
    // Try with invalid value
    await user.clear(valueInput);
    await user.type(valueInput, '-50');
    await user.click(submitButton);
    
    // Check for validation error
    expect(await screen.findByText(/positive number/i)).toBeInTheDocument();
    expect(mockSubmit).not.toHaveBeenCalled();
  });

  it('should validate timestamp format', async () => {
    const user = userEvent.setup();
    render(<GlucoseReadingForm onSubmit={mockSubmit} />);
    
    const dateInput = screen.getByTestId('timestamp-input');
    const submitButton = screen.getByTestId('submit-button');
    
    // Clear the date input to make it invalid
    await user.clear(dateInput);
    
    // Fill in a valid value to avoid other validation errors
    const valueInput = screen.getByTestId('glucose-value-input');
    await user.clear(valueInput);
    await user.type(valueInput, '120');
    
    // Select a meal context to avoid other validation errors
    const mealContextSelect = screen.getByTestId('meal-context-select');
    await user.selectOptions(mealContextSelect, 'FASTING');
    
    await user.click(submitButton);
    
    // Check for validation error
    expect(await screen.findByText(/invalid date format/i)).toBeInTheDocument();
    expect(mockSubmit).not.toHaveBeenCalled();
  });

  it('should validate meal context is selected', async () => {
    const user = userEvent.setup();
    render(<GlucoseReadingForm onSubmit={mockSubmit} />);
    
    const valueInput = screen.getByTestId('glucose-value-input');
    const dateInput = screen.getByTestId('timestamp-input');
    const submitButton = screen.getByTestId('submit-button');
    
    // Fill in other required fields but leave meal context empty
    await user.clear(valueInput);
    await user.type(valueInput, '120');
    
    const validDate = new Date();
    validDate.setHours(validDate.getHours() - 1);
    const validDateString = validDate.toISOString().slice(0, 16);
    
    await user.clear(dateInput);
    await user.type(dateInput, validDateString);
    
    await user.click(submitButton);
    
    // Check for validation error - look for any text that indicates meal context is invalid
    const errorElement = await screen.findByText(/invalid enum value/i);
    expect(errorElement).toBeInTheDocument();
    expect(mockSubmit).not.toHaveBeenCalled();
  });

  it('should display all meal context options', () => {
    render(<GlucoseReadingForm onSubmit={mockSubmit} />);
    
    const mealContextSelect = screen.getByTestId('meal-context-select');
    
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
  
  it('should successfully submit the form with valid data', async () => {
    const user = userEvent.setup();
    
    // Mock the form submission function
    const mockSubmitFn = vi.fn().mockResolvedValue(undefined);
    
    render(<GlucoseReadingForm onSubmit={mockSubmitFn} />);
    
    // Get form elements
    const valueInput = screen.getByTestId('glucose-value-input');
    const dateInput = screen.getByTestId('timestamp-input');
    const mealContextSelect = screen.getByTestId('meal-context-select');
    const notesInput = screen.getByTestId('notes-input');
    const submitButton = screen.getByTestId('submit-button');
    
    // Fill in valid data
    await user.clear(valueInput);
    await user.type(valueInput, '120');
    
    // Use a timestamp in the past to avoid future date validation issues
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 1); // Use yesterday to be safe
    const pastDateString = pastDate.toISOString().slice(0, 16);
    
    await user.clear(dateInput);
    await user.type(dateInput, pastDateString);
    
    // Select a meal context
    await user.selectOptions(mealContextSelect, 'FASTING');
    
    // Add some notes
    await user.clear(notesInput);
    await user.type(notesInput, 'Test reading');
    
    // Submit the form
    await user.click(submitButton);
    
    // Verify the form was submitted with correct data
    await waitFor(() => {
      expect(mockSubmitFn).toHaveBeenCalledTimes(1);
    });
    
    // Check the submitted data
    if (mockSubmitFn.mock.calls.length > 0) {
      const submittedData = mockSubmitFn.mock.calls[0][0];
      expect(submittedData.value).toBe(120);
      expect(submittedData.mealContext).toBe('FASTING');
      expect(submittedData.notes).toBe('Test reading');
      expect(new Date(submittedData.timestamp)).toBeInstanceOf(Date);
    }
  });
});
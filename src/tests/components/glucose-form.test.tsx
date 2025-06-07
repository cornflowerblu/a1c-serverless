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
});
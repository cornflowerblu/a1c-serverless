import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import UserList from '../../app/components/users';

const mockUser = vi.fn()

// Mock the Clerk hook
vi.mock('@clerk/nextjs', () => ({
  useUser: () => mockUser()
}));

// Mock fetch
global.fetch = vi.fn();

describe('UserList Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser.mockReturnValue({ isLoaded: true });
  });

  it('should show loading state initially', () => {
    // Mock fetch to return a pending promise
    vi.mocked(fetch).mockImplementation(() => new Promise(() => {}));
    
    render(<UserList />);
    
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should render users when fetch is successful', async () => {
    // Mock successful response
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        users: [
          { id: '1', name: 'John Doe', email: 'john@example.com' },
          { id: '2', name: 'Jane Smith', email: 'jane@example.com' }
        ]
      })
    } as Response);
    
    render(<UserList />);
    
    // Wait for the users to be displayed
    await waitFor(() => {
      expect(screen.getByText('John Doe', { exact: false })).toBeInTheDocument();
      expect(screen.getByText('jane@example.com', { exact: false })).toBeInTheDocument();
    });
    
    // Verify that loading state is gone
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
  });

  it('should display error message when fetch fails', async () => {
    // Mock failed response
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 500
    } as Response);
    
    render(<UserList />);
    
    // Wait for the error message to be displayed
    await waitFor(() => {
      expect(screen.getByText('Error: Error: 500')).toBeInTheDocument();
    });
    
    // Verify that loading state is gone
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
  });

  it('should display "No users found" when the users array is empty', async () => {
    // Mock successful response with empty users array
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ users: [] })
    } as Response);
    
    render(<UserList />);
    
    // Wait for the "No users found" message to be displayed
    await waitFor(() => {
      expect(screen.getByText('No users found')).toBeInTheDocument();
    });
    
    // Verify that loading state is gone
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
  });

  it('should not fetch users when Clerk is not loaded', async () => {
    // Override the mock for this specific test
    mockUser.mockReturnValue({ isLoaded: false }),
    
    render(<UserList />);
    
    // Verify that fetch was not called
    expect(fetch).not.toHaveBeenCalled();
  });

  it('should handle network errors during fetch', async () => {
    // Mock fetch to throw a network error
    vi.mocked(fetch).mockImplementationOnce(() => {
      throw new Error('Network error');
    });
    
    render(<UserList />);
    
    // Wait for the error message to be displayed
    await waitFor(() => {
      expect(screen.getByText('Error: Network error')).toBeInTheDocument();
    });
    
    // Verify that loading state is gone
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
  });
});


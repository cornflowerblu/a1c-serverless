// cypress/e2e/auth-example.cy.ts

describe('Authentication Example', () => {
  beforeEach(() => {
    // Mock Clerk authentication before each test
    cy.mockClerkAuth();
    
    // Also mock API authentication
    cy.mockApiAuth();
  });
  
  it('should access protected dashboard', () => {
    // Visit the dashboard directly - auth is mocked
    cy.visitAsAuthenticatedUser('/dashboard');
    
    // Verify dashboard elements are visible
    cy.get('[data-testid="dashboard-summary"]').should('exist');
    cy.get('[data-testid="recent-readings"]').should('exist');
  });
  
  it('should show admin features for admin users', () => {
    // Mock authentication as admin user
    cy.mockClerkAuth('admin');
    
    // Visit dashboard
    cy.visitAsAuthenticatedUser('/dashboard');
    
    // Check for admin-specific elements
    cy.get('[data-testid="admin-section"]').should('exist');
  });
  
  it('should handle API requests with authentication', () => {
    cy.visitAsAuthenticatedUser('/readings');
    
    // Intercept and mock API response
    cy.intercept('GET', '/api/readings*', {
      statusCode: 200,
      body: {
        readings: [
          {
            id: '1',
            value: 120,
            timestamp: new Date().toISOString(),
            notes: 'Test reading'
          }
        ]
      }
    }).as('getReadings');
    
    // Wait for API call and verify data is displayed
    cy.wait('@getReadings');
    cy.contains('120').should('be.visible');
  });
});
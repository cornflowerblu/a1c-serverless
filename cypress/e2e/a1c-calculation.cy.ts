// cypress/e2e/a1c-calculation.cy.ts
describe('A1C Calculation', () => {
  beforeEach(() => {
    // Login before each test
    cy.visitAsAuthenticatedUser('/dashboard');
    
    // Intercept API calls
    cy.intercept('GET', '/api/summary', { fixture: 'summary.json' }).as('getSummary');
    cy.intercept('GET', '/api/months/*', { fixture: 'month-detail.json' }).as('getMonthDetail');
    cy.intercept('POST', '/api/months/*/calculate', {
      statusCode: 200,
      body: { 
        id: 'month-id',
        a1c_value: 6.5,
        calculated_at: new Date().toISOString()
      }
    }).as('calculateA1C');
  });

  it('should display A1C summary on dashboard', () => {
    // Wait for the summary to load
    cy.wait('@getSummary');
    
    // Check if A1C summary is displayed
    cy.get('[data-testid="a1c-summary"]').should('exist');
    cy.get('[data-testid="current-a1c"]').should('contain', '6.5');
  });

  it('should navigate to month detail view', () => {
    // Wait for the summary to load
    cy.wait('@getSummary');
    
    // Click on a month to view details
    cy.get('[data-testid="month-item"]').first().click();
    
    // Wait for month details to load
    cy.wait('@getMonthDetail');
    
    // Verify month detail view is displayed
    cy.get('[data-testid="month-detail-view"]').should('exist');
    cy.get('[data-testid="month-a1c-value"]').should('be.visible');
  });

  it('should recalculate A1C for a month', () => {
    // Navigate to month detail
    cy.get('[data-testid="month-item"]').first().click();
    cy.wait('@getMonthDetail');
    
    // Click recalculate button
    cy.get('[data-testid="recalculate-a1c-button"]').click();
    
    // Confirm recalculation
    cy.get('[data-testid="confirm-recalculate-button"]').click();
    
    // Wait for calculation to complete
    cy.wait('@calculateA1C');
    
    // Verify success message
    cy.get('[data-testid="calculation-success-message"]').should('be.visible');
    
    // Verify updated A1C value
    cy.get('[data-testid="month-a1c-value"]').should('contain', '6.5');
  });

  it('should show A1C trend chart', () => {
    // Check if trend chart exists
    cy.get('[data-testid="a1c-trend-chart"]').should('exist');
    
    // Verify chart elements
    cy.get('[data-testid="chart-legend"]').should('be.visible');
    cy.get('[data-testid="chart-tooltip"]').should('exist');
  });
});
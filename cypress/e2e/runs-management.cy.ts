// cypress/e2e/runs-management.cy.ts
describe('Runs Management', () => {
  beforeEach(() => {
    // Login before each test
    cy.visitAsAuthenticatedUser('/runs');
    
    // Intercept API calls
    cy.intercept('GET', '/api/runs', { fixture: 'runs.json' }).as('getRuns');
    cy.intercept('GET', '/api/runs/*', { fixture: 'run-detail.json' }).as('getRunDetail');
    cy.intercept('POST', '/api/runs', {
      statusCode: 201,
      body: { 
        id: 'new-run-id',
        name: 'Test Run',
        start_date: new Date().toISOString(),
        end_date: new Date().toISOString(),
        description: 'Test run description'
      }
    }).as('createRun');
    cy.intercept('GET', '/api/runs/*/readings', { fixture: 'run-readings.json' }).as('getRunReadings');
  });

  it('should display runs list', () => {
    // Wait for the runs to load
    cy.wait('@getRuns');
    
    // Check if runs are displayed
    cy.get('[data-testid="runs-list"]').should('exist');
    cy.get('[data-testid="run-card"]').should('have.length.at.least', 1);
  });

  it('should open create run form', () => {
    cy.get('[data-testid="create-run-button"]').click();
    cy.get('[data-testid="create-run-form"]').should('be.visible');
  });

  it('should create a new run', () => {
    // Open create run form
    cy.get('[data-testid="create-run-button"]').click();
    
    // Fill the form
    cy.get('[data-testid="run-name-input"]').type('Test Run');
    cy.get('[data-testid="run-start-date"]').type('2023-01-01');
    cy.get('[data-testid="run-end-date"]').type('2023-01-31');
    cy.get('[data-testid="run-description"]').type('Test run description');
    
    // Submit the form
    cy.get('[data-testid="submit-run-button"]').click();
    
    // Wait for the API call
    cy.wait('@createRun');
    
    // Verify success message
    cy.get('[data-testid="success-message"]').should('be.visible');
    
    // Verify the run is added to the list
    cy.get('[data-testid="run-card"]').should('contain', 'Test Run');
  });

  it('should view run details', () => {
    // Click on a run to view details
    cy.get('[data-testid="run-card"]').first().click();
    
    // Wait for run details to load
    cy.wait('@getRunDetail');
    cy.wait('@getRunReadings');
    
    // Verify run detail view is displayed
    cy.get('[data-testid="run-detail-view"]').should('exist');
    cy.get('[data-testid="run-readings-list"]').should('be.visible');
    cy.get('[data-testid="run-statistics"]').should('exist');
  });

  it('should filter runs by date range', () => {
    // Open date filter
    cy.get('[data-testid="runs-filter-button"]').click();
    
    // Select date range
    cy.get('[data-testid="filter-start-date"]').type('2023-01-01');
    cy.get('[data-testid="filter-end-date"]').type('2023-01-31');
    
    // Apply filter
    cy.get('[data-testid="apply-filter-button"]').click();
    
    // Verify filtered results
    cy.get('[data-testid="filtered-runs-label"]').should('contain', 'January 2023');
  });
});
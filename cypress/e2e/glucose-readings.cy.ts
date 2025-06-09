// cypress/e2e/glucose-readings.cy.ts
describe('Glucose Readings Management', () => {
  beforeEach(() => {
    // Login before each test with enhanced auth command
    cy.visitAsAuthenticatedUser('/readings');
    
    // Intercept API calls with auth headers
    cy.intercept('GET', '/api/readings', (req) => {
      req.headers['x-cypress-test-auth'] = 'true';
      req.reply({ fixture: 'readings.json' });
    }).as('getReadings');
    
    cy.intercept('POST', '/api/readings', (req) => {
      req.headers['x-cypress-test-auth'] = 'true';
      req.reply({
        statusCode: 201,
        body: { 
          id: 'new-reading-id',
          value: 120,
          timestamp: new Date().toISOString(),
          meal_context: 'before_meal'
        }
      });
    }).as('createReading');
  });

  it('should display glucose readings list', () => {
    // Wait for the readings to load
    cy.wait('@getReadings');
    
    // Check if readings are displayed
    cy.get('[data-testid="reading-list"]').should('exist');
    cy.get('[data-testid="reading-item"]').should('have.length.at.least', 1);
  });

  it('should open add reading dialog', () => {
    cy.get('[data-testid="add-reading-button"]').click();
    cy.get('[data-testid="add-reading-dialog"]').should('be.visible');
  });

  it('should add a new glucose reading', () => {
    // Open add reading dialog
    cy.get('[data-testid="add-reading-button"]').click();
    
    // Fill the form
    cy.get('[data-testid="glucose-value-input"]').type('120');
    cy.get('[data-testid="meal-context-select"]').select('before_meal');
    cy.get('[data-testid="reading-notes"]').type('Test reading');
    
    // Submit the form
    cy.get('[data-testid="submit-reading-button"]').click();
    
    // Wait for the API call
    cy.wait('@createReading');
    
    // Verify success message
    cy.get('[data-testid="success-message"]').should('be.visible');
    
    // Verify the reading is added to the list
    cy.get('[data-testid="reading-item"]').should('contain', '120');
  });

  it('should filter readings by date range', () => {
    // Open date filter
    cy.get('[data-testid="date-filter-button"]').click();
    
    // Select date range
    cy.get('[data-testid="start-date-input"]').type('2023-01-01');
    cy.get('[data-testid="end-date-input"]').type('2023-01-31');
    
    // Apply filter
    cy.get('[data-testid="apply-filter-button"]').click();
    
    // Verify filtered results
    cy.get('[data-testid="filtered-results-label"]').should('contain', 'January 2023');
  });
});
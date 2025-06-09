// cypress/e2e/auth-persistence.cy.ts
describe('Authentication Persistence', () => {
  beforeEach(() => {
    // Clear any existing auth state
    cy.clearCookies();
    cy.clearLocalStorage();
  });

  it('should maintain authentication across page navigations', () => {
    // Login with enhanced auth command
    cy.loginWithClerk();

    // Visit dashboard with auth headers
    cy.visit('/dashboard', {
      headers: {
        'x-cypress-test-auth': 'true',
      },
    });

    // Verify we're on the dashboard
    cy.url().should('include', '/dashboard');
    cy.get('[data-testid="dashboard-summary"]').should('exist');

    // Navigate to readings page
    cy.get('[data-testid="nav-readings"]').click();

    // Verify we're still authenticated
    cy.url().should('include', '/readings');
    cy.get('[data-testid="reading-list"]').should('exist');

    // Navigate to runs page
    cy.get('[data-testid="nav-runs"]').click();

    // Verify we're still authenticated
    cy.url().should('include', '/runs');
    cy.get('[data-testid="runs-list"]').should('exist');
  });

  it('should maintain authentication after page refresh', () => {
    // Login and visit dashboard
    cy.loginWithClerk();
    cy.visit('/dashboard', {
      headers: {
        'x-cypress-test-auth': 'true',
      },
    });

    // Verify we're on the dashboard
    cy.url().should('include', '/dashboard');

    // Refresh the page
    cy.reload();

    // Verify we're still on the dashboard and authenticated
    cy.url().should('include', '/dashboard');
    cy.get('[data-testid="dashboard-summary"]').should('exist');
  });

  it('should properly clean up authentication between tests', () => {
    // First test with admin user
    cy.loginWithUserFixture('admin');
    cy.visit('/dashboard', {
      headers: {
        'x-cypress-test-auth': 'true',
      },
    });

    // Verify admin section is visible
    cy.get('[data-testid="admin-section"]').should('exist');

    // Clear auth state
    cy.clearCookies();
    cy.clearLocalStorage();

    // Second test with regular user
    cy.loginWithUserFixture('default');
    cy.visit('/dashboard', {
      headers: {
        'x-cypress-test-auth': 'true',
      },
    });

    // Verify admin section is not visible
    cy.get('[data-testid="admin-section"]').should('not.exist');
  });
});

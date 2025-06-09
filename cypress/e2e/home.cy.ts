// cypress/e2e/home.cy.ts
import { loadUserFixture } from '../support/auth-utils';

describe('Home Page and Dashboard', () => {
  it('should display landing page for unauthenticated users', () => {
    // Visit home page without authentication
    cy.visit('/');
    
    // Check landing page elements
    cy.get('[data-testid="landing-hero"]').should('be.visible');
    cy.get('[data-testid="feature-section"]').should('exist');
    cy.get('[data-testid="cta-section"]').should('be.visible');
    
    // Check navigation
    cy.get('[data-testid="login-button"]').should('be.visible');
    cy.get('[data-testid="signup-button"]').should('exist');
  });
  
  it('should redirect to dashboard for authenticated users', () => {
    // Login with enhanced auth command and visit home page
    cy.loginWithClerkGoogle();
    cy.visit('/dashboard', {
      headers: {
        'x-cypress-test-auth': 'true'
      }
    });
    
    // Should redirect to dashboard
    cy.url().should('include', '/dashboard');
    
    // Check dashboard elements
    cy.get('[data-testid="dashboard-summary"]').should('exist');
  });
  
  describe('Dashboard', () => {
    beforeEach(() => {
      // Login before each test with enhanced auth command
      cy.visitAsAuthenticatedUser('/dashboard');
      
      // Intercept API calls with auth headers
      cy.intercept('GET', '/api/summary', (req) => {
        req.headers['x-cypress-test-auth'] = 'true';
        req.reply({ fixture: 'summary.json' });
      }).as('getSummary');
      
      cy.intercept('GET', '/api/readings?limit=5', (req) => {
        req.headers['x-cypress-test-auth'] = 'true';
        req.reply({ fixture: 'recent-readings.json' });
      }).as('getRecentReadings');
    });
    
    it('should display dashboard summary', () => {
      // Wait for data to load
      cy.wait('@getSummary');
      cy.wait('@getRecentReadings');
      
      // Check dashboard components
      cy.get('[data-testid="dashboard-summary"]').should('be.visible');
      cy.get('[data-testid="recent-readings"]').should('exist');
      cy.get('[data-testid="a1c-estimate"]').should('be.visible');
    });
    
    it('should navigate to readings page', () => {
      cy.get('[data-testid="view-all-readings-button"]').click();
      cy.url().should('include', '/readings');
    });
    
    it('should navigate to runs page', () => {
      cy.get('[data-testid="view-runs-button"]').click();
      cy.url().should('include', '/runs');
    });
    
    it('should show A1C estimator', () => {
      cy.get('[data-testid="a1c-estimator"]').should('be.visible');
      
      // Enter a glucose value
      cy.get('[data-testid="estimator-input"]').clear().type('120');
      
      // Click calculate
      cy.get('[data-testid="estimate-button"]').click();
      
      // Check result is displayed
      cy.get('[data-testid="estimate-result"]').should('be.visible');
    });
  });
  
  describe('User Role Tests', () => {
    it('should show admin features for admin users', () => {
      // Login as admin user
      cy.loginWithUserFixture('admin');
      cy.visitAsAuthenticatedUser('/dashboard');
      
      // Check for admin-specific elements
      // This is just a placeholder - update with actual admin elements
      cy.get('[data-testid="admin-section"]').should('exist');
    });
    
    it('should show caretaker features for caretaker users', () => {
      // Login as caretaker user
      cy.loginWithUserFixture('caretaker');
      cy.visitAsAuthenticatedUser('/dashboard');
      
      // Check for caretaker-specific elements
      // This is just a placeholder - update with actual caretaker elements
      cy.get('[data-testid="caretaker-section"]').should('exist');
    });
  });
});
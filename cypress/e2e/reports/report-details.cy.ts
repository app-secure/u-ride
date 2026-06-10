import { AdminSelectors } from '../../support/selectors';

describe('Reportes - Detalle y Evidencia (Admin)', () => {
  beforeEach(() => {
    cy.loginAsPassenger();
    cy.visit('/app/admin/reports');
    cy.wait(2000);
  });

  it('Debe permitir abrir y cerrar el modal de evidencia adjunta', () => {
    cy.get('body').then($body => {
      // Find reports with attached evidence
      const reportWithEvidence = $body.find(AdminSelectors.evidenceModalBtn);
      if (reportWithEvidence.length > 0) {
        cy.wrap(reportWithEvidence).first().click({ force: true });
        cy.wait(1000);
        
        // Assert evidence modal is open
        cy.get('.evidence-overlay').should('be.visible');
        cy.get('.evidence-modal img.evidence-img').should('exist');
        
        // Close modal
        cy.get('.evidence-modal .close-btn').click({ force: true });
        cy.wait(500);
        cy.get('.evidence-overlay').should('not.exist');
      } else {
        cy.log('No reports with evidence available to test.');
      }
    });
  });
});

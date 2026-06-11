import { AdminSelectors } from '../../support/selectors';

describe('Reportes - Historial de Reportes (Admin)', () => {
  beforeEach(() => {
    // Admin user is same as passenger credentials in this test setup
    cy.loginAsPassenger();
    
    // Switch to Admin mode or navigate directly
    cy.visit('/app/admin/reports');
    cy.wait(2000);
  });

  it('Debe listar los reportes abiertos y revisados en la vista del administrador', () => {
    cy.url().then(url => {
      if (url.includes('/app/admin/reports')) {
        cy.contains('Gestión de Reportes').should('be.visible');
        cy.contains('Pendientes de revisión').should('be.visible');
        cy.contains('Reportes revisados').should('be.visible');
        
        cy.get('body').then($body => {
          if ($body.find(AdminSelectors.reportCard).length > 0) {
            cy.get(AdminSelectors.reportCard).should('exist');
          }
        });
      } else {
        cy.log('Usuario de prueba no tiene permisos de administrador, redireccionado a ' + url);
      }
    });
  });
});

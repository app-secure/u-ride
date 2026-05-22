import { loginAndNavigateTo } from './trips-helper';

describe('Viajes - Visualizar Viaje', () => {

  beforeEach(() => {
    loginAndNavigateTo('Viajar', '/app/trips');
  });

  it('Debe visualizar los detalles de un viaje', () => {
    cy.wait(2000);

    // Entrar al primer viaje listado si existe
    cy.get('body').then($body => {
      if ($body.find('app-trip-card').length > 0) {
        cy.get('app-trip-card').first().click();
        cy.wait(2000);
        
        // Verificar elementos clave en la página de detalle
        cy.get('.header-section').should('be.visible'); // Tiene título y precio
        cy.get('.driver-info').should('be.visible'); // Información del conductor
        cy.get('#map').should('exist'); // Mapa de la ruta
        cy.url().should('include', '/app/trips/');
      } else {
        cy.log('No hay viajes disponibles para visualizar');
      }
    });
  });
});

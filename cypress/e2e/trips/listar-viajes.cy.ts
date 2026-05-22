import { loginAndNavigateTo } from './trips-helper';

describe('Viajes - Listar Viajes', () => {

  beforeEach(() => {
    loginAndNavigateTo('Viajar', '/app/trips');
  });

  it('Debe listar los viajes disponibles en la pantalla principal', () => {
    cy.wait(2000);

    // Verificar que la lista no esté vacía o que al menos exista el contenedor
    cy.get('app-trip-card, .trip-item, .trips-list').should('exist');
    
    // Si hay un mensaje de "no hay viajes", también es un resultado válido
    cy.get('body').then($body => {
      if ($body.find('app-trip-card').length > 0) {
        cy.get('app-trip-card').first().should('be.visible');
      } else {
        cy.contains('No hay viajes disponibles').should('be.visible');
      }
    });
  });
});

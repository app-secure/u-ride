import { loginAndNavigateTo } from './trips-helper';

describe('Viajes - Iniciar Viaje', () => {

  beforeEach(() => {
    loginAndNavigateTo('Conducir', '/app/my-trips');
  });

  it('Debe iniciar un viaje programado', () => {
    cy.wait(2000);

    // Hacer clic en Iniciar Viaje en el primer viaje que esté Activo
    cy.get('.trip-card').filter(':contains("Activo")').first().within(() => {
      cy.contains('ion-button', 'Iniciar Viaje').click({ force: true });
    });
    cy.wait(1000);

    // Confirmar en el alert/modal de Ionic
    cy.get('.alert-button').contains('Iniciar', { matchCase: false }).click({ force: true });

    // Verificar el toast de éxito
    cy.get('ion-toast', { timeout: 10000 }).should('exist');
    
    // Verificar que el estado cambió a "En Curso" y el botón a "Finalizar Viaje"
    cy.get('.trip-card').first().within(() => {
      cy.get('.status-badge').should('contain.text', 'En Curso');
      cy.contains('ion-button', 'Finalizar Viaje').should('exist');
      cy.contains('ion-button', 'Editar').should('not.exist');
      cy.contains('ion-button', 'Eliminar').should('not.exist');
    });
  });
});

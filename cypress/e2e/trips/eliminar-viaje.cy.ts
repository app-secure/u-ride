import { loginAndNavigateTo, clickIonButton } from './trips-helper';

describe('Viajes - Eliminar Viaje', () => {

  beforeEach(() => {
    loginAndNavigateTo('Conducir', '/app/my-trips');
  });

  it('Debe eliminar un viaje programado', () => {
    cy.wait(2000);

    // Hacer clic en Eliminar en el primer viaje programado
    cy.get('.trip-card').first().contains('ion-button', 'Eliminar').click({ force: true });
    cy.wait(1000);

    // Confirmar en el alert/modal de Ionic
    // Nota: Las alertas de Ionic no usan <ion-button> internamente, usan <button class="alert-button">
    cy.get('.alert-button').contains('Eliminar', { matchCase: false }).click({ force: true });

    // Verificar redirección
    cy.get('ion-toast', { timeout: 10000 }).should('exist');
    cy.url().should('include', '/app/my-trips');
  });
});

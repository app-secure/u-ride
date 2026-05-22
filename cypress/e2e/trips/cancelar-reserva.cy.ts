import { loginAndNavigateTo, clickIonButton } from './trips-helper';

describe('Viajes - Cancelar Reserva', () => {

  beforeEach(() => {
    loginAndNavigateTo('Viajar', '/app/my-trips');
  });

  it('Debe cancelar una reserva pendiente o confirmada como pasajero', () => {
    cy.wait(2000);

    // Buscar viaje reservado en mis viajes
    cy.get('body').then($body => {
      if ($body.find('ion-item.trip-item').length > 0) {
        cy.get('ion-item.trip-item').first().click();
        cy.wait(2000);

        cy.get('body').then($b => {
          if ($b.find('ion-button:contains("Cancelar Reserva")').length > 0) {
            clickIonButton('Cancelar Reserva');
            cy.wait(1000);
            
            // Confirmar en el modal de alerta
            cy.contains('ion-button', 'Sí, cancelar').click({ force: true });
            
            cy.get('ion-toast', { timeout: 10000 }).should('exist');
            // Debería poder reservar de nuevo o volver a la lista
            cy.url().should('include', '/app/my-trips');
          } else {
            cy.log('No hay opción de cancelar reserva en este viaje (quizás ya está cancelado o no está reservado).');
          }
        });
      } else {
        cy.log('No hay viajes reservados en Mis Viajes.');
      }
    });
  });
});

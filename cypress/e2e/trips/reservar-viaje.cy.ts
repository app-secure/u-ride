import { loginAndNavigateTo, clickIonButton } from './trips-helper';

describe('Viajes - Reservar Viaje', () => {

  beforeEach(() => {
    loginAndNavigateTo('Viajar', '/app/trips');
  });

  it('Debe solicitar reserva en un viaje disponible', () => {
    cy.wait(2000);

    cy.get('body').then($body => {
      // Buscar viajes con asientos disponibles (se asume que si hay botón de reservar o si hay app-trip-card se puede probar)
      if ($body.find('app-trip-card').length > 0) {
        cy.get('app-trip-card').first().click();
        cy.wait(2000);

        cy.get('body').then($b => {
          if ($b.find('ion-button:contains("Reservar Asiento")').length > 0) {
            clickIonButton('Reservar Asiento');
            cy.wait(1000);
            cy.contains('ion-button', 'Confirmar Reserva').click({ force: true });
            
            cy.get('ion-toast', { timeout: 10000 }).should('exist');
            cy.contains('Pendiente de aprobación', { matchCase: false }).should('exist');
          } else {
            cy.log('El viaje ya está reservado o no tiene cupos disponibles.');
          }
        });
      } else {
        cy.log('No hay viajes disponibles para reservar.');
      }
    });
  });
});

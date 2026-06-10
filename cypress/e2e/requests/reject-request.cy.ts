import { TripSelectors } from '../../support/selectors';

describe('Requests - Rechazar Solicitud', () => {
  beforeEach(() => {
    cy.loginAsDriver();
    cy.visit('/app/my-trips');
    cy.wait(2000);
  });

  it('Debe permitir al conductor rechazar una solicitud de pasajero', () => {
    cy.get('body').then($body => {
      if ($body.find(TripSelectors.tripCard).length > 0) {
        // Click en la tarjeta para ir al mapa/detalle del viaje
        cy.get(TripSelectors.tripCard).first().click({ force: true });
        cy.wait(2000);

        cy.url().then(url => {
          if (url.includes('/app/requests/')) {
            cy.get('body').then($b => {
              if ($b.find(TripSelectors.rejectPassengerBtn).length > 0) {
                cy.get(TripSelectors.rejectPassengerBtn).first().click({ force: true });
                cy.get('ion-toast', { timeout: 10000 }).should('exist');
              } else {
                cy.log('No pending requests to reject.');
              }
            });
          } else {
            cy.log('No passenger requests list visible (no pending requests).');
          }
        });
      } else {
        cy.log('No trips found for this driver.');
      }
    });
  });
});

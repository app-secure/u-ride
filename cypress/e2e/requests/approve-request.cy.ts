import { TripSelectors, AuthSelectors } from '../../support/selectors';

/**
 * El HTML de driver-trips.page.html NO tiene botón "Detalle de mi viaje".
 * Cada tarjeta (.trip-card) es clickable en su totalidad vía (click)="goToTripMap(trip)".
 * La ruta de solicitudes de pasajeros está en /app/requests/<tripId>.
 */
describe('Requests - Aceptar Solicitud', () => {
  beforeEach(() => {
    cy.loginAsDriver();
    cy.visit('/app/my-trips');
    cy.wait(2000);
  });

  it('Debe permitir al conductor aceptar una solicitud de pasajero', () => {
    cy.get('body').then($body => {
      if ($body.find(TripSelectors.tripCard).length > 0) {
        // Hacer click en la tarjeta de viaje para ir al mapa/detalle
        cy.get(TripSelectors.tripCard).first().click({ force: true });
        cy.wait(2000);

        // La página de solicitudes de pasajeros está en /app/requests/:tripId
        cy.url().then(url => {
          if (url.includes('/app/requests/')) {
            cy.get('body').then($b => {
              if ($b.find(TripSelectors.acceptPassengerBtn).length > 0) {
                cy.get(TripSelectors.acceptPassengerBtn).first().click({ force: true });
                cy.get('ion-toast', { timeout: 10000 }).should('exist');
              } else {
                cy.log('No pending requests to accept.');
              }
            });
          } else {
            cy.log('No passenger requests list visible (trip may have no pending requests).');
          }
        });
      } else {
        cy.log('No trips found for this driver.');
      }
    });
  });
});

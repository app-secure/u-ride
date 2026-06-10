import { TripSelectors } from '../../support/selectors';

describe('Viajes - Iniciar Viaje', () => {
  beforeEach(() => {
    cy.loginAsDriver();
    cy.visit('/app/my-trips');
    cy.wait(2000);
  });

  it('Debe iniciar un viaje programado', () => {
    cy.get('body').then($body => {
      // Find an active trip card
      const activeTrips = $body.find(`${TripSelectors.tripCard}:contains("Activo")`);
      if (activeTrips.length > 0) {
        cy.wrap(activeTrips).first().within(() => {
          cy.get(TripSelectors.startTripBtn).click({ force: true });
        });
        cy.wait(1000);

        // Confirm Ionic alert
        cy.get('.alert-button').contains('Iniciar', { matchCase: false }).click({ force: true });

        // Verify toast and new status
        cy.get('ion-toast', { timeout: 10000 }).should('exist');
        // Re-query the DOM to avoid detached element errors
        cy.get(`${TripSelectors.tripCard}:contains("En curso")`).first().within(() => {
          cy.get(TripSelectors.statusBadge).should('contain.text', 'En curso');
          cy.get(TripSelectors.finishTripBtn).should('exist');
        });
      } else {
        cy.log('No active trips to start.');
      }
    });
  });
});

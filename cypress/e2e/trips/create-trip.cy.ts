import { TripSelectors } from '../../support/selectors';
import { loginAndNavigateTo, clickIonButton } from '../../support/trips-helper';

describe('Viajes - Crear Viaje', () => {
  beforeEach(() => {
    cy.loginAsDriver();
  });

  it('Debe crear un viaje con datos válidos', () => {
    cy.createTrip();
  });

  it('Debe mostrar validaciones al intentar crear un viaje con datos vacíos', () => {
    cy.visit('/app/publish');
    cy.wait(2000);

    // Empty out form and attempt submit
    cy.get('body').then($body => {
      // Find all input items, clear them
      cy.get(TripSelectors.seatsInput).clear({ force: true });
      cy.get(TripSelectors.priceInput).clear({ force: true });
      
      // Attempt submit
      cy.get('button, ion-button').contains('Publicar Viaje').then($btn => {
        if (!$btn.is(':disabled') && !$btn.attr('disabled')) {
          cy.wrap($btn).click({ force: true });
          // Assert we remain on publish page because of form invalidation
          cy.url().should('include', '/app/publish');
        } else {
          cy.wrap($btn).should('be.disabled');
        }
      });
    });
  });
});

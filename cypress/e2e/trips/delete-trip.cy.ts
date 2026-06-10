import { TripSelectors, AuthSelectors } from '../../support/selectors';

describe('Viajes - Eliminar Viaje', () => {
  beforeEach(() => {
    cy.loginAsDriver();
    cy.visit('/app/my-trips');
    cy.wait(2000);
  });

  it('Debe eliminar un viaje programado', () => {
    cy.get('body').then($body => {
      if ($body.find(TripSelectors.tripCard).length > 0) {
        // Primero hay que entrar al detalle del viaje
        cy.get(TripSelectors.tripCard).first().click({ force: true });
        cy.wait(2000);

        cy.get('body').then($detailBody => {
          // El botón puede decir "Eliminar viaje" o "Cancelar viaje" dependiendo si hay pasajeros
          if ($detailBody.text().match(/Eliminar|Cancelar/i)) {
            cy.contains('button, ion-button', /Eliminar|Cancelar/i).click({ force: true });
            cy.wait(1000);

            // Confirm in alert modal
            cy.get('.alert-button').contains(/Eliminar|Sí, cancelar/i).click({ force: true });

            // Verify toast
            cy.get(AuthSelectors.toast, { timeout: 10000 }).should('exist');
            // Al eliminar redirige a my-trips
            cy.url().should('include', '/app/my-trips');
          } else {
            cy.log('No delete option available for this trip.');
          }
        });
      } else {
        cy.log('No trips to delete.');
      }
    });
  });
});

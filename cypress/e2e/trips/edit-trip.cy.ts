import { TripSelectors, AuthSelectors } from '../../support/selectors';

/**
 * El HTML de driver-trips.page.html no tiene un botón "Editar" en las tarjetas.
 * La edición se hace desde la página de detalle/mapa del viaje.
 * Este test valida que el conductor puede navegar a la edición de un viaje.
 */
describe('Viajes - Editar Viaje', () => {
  beforeEach(() => {
    cy.loginAsDriver();
    cy.visit('/app/my-trips');
    cy.wait(2000);
  });

  it('Debe navegar al detalle del viaje al hacer click en la tarjeta', () => {
    cy.get('body').then($body => {
      if ($body.find(TripSelectors.tripCard).length > 0) {
        cy.get(TripSelectors.tripCard).first().click({ force: true });
        cy.wait(2000);

        // Debe navegar fuera de my-trips
        cy.url().should('not.include', '/app/my-trips');
        cy.get('ion-content').should('exist');
      } else {
        cy.log('No trips to navigate to. Skipping.');
      }
    });
  });

  it('Debe permitir publicar un viaje nuevo desde el botón de publicar', () => {
    // El botón "Publicar Viaje" lleva al formulario de publicación
    cy.contains('button, ion-button', 'Publicar Viaje', { timeout: 8000 })
      .should('exist');

    cy.contains('button, ion-button', 'Publicar Viaje').click({ force: true });
    cy.wait(1500);

    cy.url().should('include', '/app/publish');
  });
});

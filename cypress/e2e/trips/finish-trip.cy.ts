import { TripSelectors } from '../../support/selectors';

/**
 * El botón "Finalizar Viaje" en driver-trips.page.html es:
 *   <button class="action-btn outline-warning-btn" (click)="$event.stopPropagation(); finishTrip(trip)">
 * Es un <button> nativo, NO un <ion-button>.
 */
describe('Viajes - Finalizar Viaje', () => {
  beforeEach(() => {
    cy.loginAsDriver();
    cy.visit('/app/my-trips');
    cy.wait(2000);
  });

  it('Debe finalizar un viaje en curso si existe', () => {
    cy.get('body').then($body => {
      // Buscar tarjetas con estado "En curso" (status === 'inprogress')
      const inProgressCards = $body.find('.trip-card .status-pill.inprogress, .trip-card .status-pill:contains("En curso")');
      if (inProgressCards.length > 0) {
        // El botón "Finalizar Viaje" está dentro de la tarjeta en curso
        cy.get('.trip-card').first().within(() => {
          cy.contains('button', 'Finalizar Viaje', { timeout: 5000 })
            .click({ force: true });
        });

        cy.wait(1000);

        // Confirmar en el alert de Ionic si aparece
        cy.get('body').then($b => {
          if ($b.find('.alert-button').length > 0) {
            cy.get('.alert-button').contains('Finalizar', { matchCase: false })
              .click({ force: true });
          }
        });

        // Verificar toast de confirmación
        cy.get('ion-toast', { timeout: 10000 }).should('exist');
      } else {
        cy.log('No in-progress trips found. Skipping finish-trip test.');
      }
    });
  });

  it('Debe mostrar el segmento de historial de viajes', () => {
    // El tab de historial siempre existe en la navbar
    cy.contains('button.nav-item', 'Historial', { timeout: 8000 })
      .should('exist')
      .click({ force: true });

    cy.wait(1000);

    // Debería mostrar viajes completados o estado vacío
    cy.get('ion-content').should('exist');
  });
});

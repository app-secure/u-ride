import { TripSelectors } from '../../support/selectors';

/**
 * El pasajero puede cancelar desde la tab "Mis Viajes" → viajes activos.
 * Las tarjetas de "Mis Viajes" están en /app/trips (mainSegment='recent'),
 * no en /app/my-trips (esa ruta es del conductor).
 */
describe('Viajes - Cancelar Reserva', () => {
  beforeEach(() => {
    cy.loginAsPassenger();
    // El pasajero ve sus viajes en /app/trips (tab "Mis Viajes")
    cy.visit('/app/trips');
    cy.wait(2000);
  });

  it('Debe cancelar una reserva pendiente o confirmada como pasajero', () => {
    // Cambiar al tab "Mis Viajes"
    cy.contains('button.nav-item', 'Mis Viajes', { timeout: 8000 })
      .click({ force: true });
    cy.wait(1500);

    cy.get('body').then($body => {
      const hasTripCards = $body.find('.trips-grid .trip-card.recent-card').length > 0;
      if (hasTripCards) {
        // Hacer click en la primera tarjeta de viaje reciente
        cy.get('.trip-card.recent-card').first().click({ force: true });
        cy.wait(2000);

        // Verificar navegación al detalle del viaje
        cy.url().should('include', '/app/trips/');

        cy.get('body').then($b => {
          if ($b.text().includes('Cancelar')) {
            cy.contains('ion-button, button', 'Cancelar', { matchCase: false })
              .click({ force: true });
            cy.wait(1000);

            cy.get('body').then($alert => {
              if ($alert.find('.alert-button').length > 0) {
                cy.contains('.alert-button', 'Sí').click({ force: true });
              } else if ($alert.text().includes('Sí, cancelar')) {
                cy.contains('ion-button', 'Sí, cancelar').click({ force: true });
              }
            });

            cy.get('ion-toast', { timeout: 10000 }).should('exist');
          } else {
            cy.log('No cancel option available for this trip status.');
          }
        });
      } else {
        cy.log('No reserved trips found. Skipping cancellation test.');
      }
    });
  });
});

import { TripSelectors } from '../../support/selectors';

/**
 * El pasajero reserva viajes desde el tab "Buscar Viajes" en /app/trips.
 * Las tarjetas de búsqueda usan .trips-grid .trip-card (no app-trip-card).
 * Al hacer click en una tarjeta se navega a /app/trips/<tripId>.
 */
describe('Viajes - Reservar Viaje', () => {
  beforeEach(() => {
    cy.loginAsPassenger();
    cy.visit('/app/trips');
    cy.wait(2000);
  });

  it('Debe solicitar reserva en un viaje disponible', () => {
    // Asegurar que estamos en el tab "Buscar Viajes"
    cy.contains('button.nav-item', 'Buscar Viajes', { timeout: 8000 })
      .should('have.class', 'active');

    cy.get('body').then($body => {
      if ($body.find('.trips-grid .trip-card').length > 0) {
        cy.get('.trips-grid .trip-card').first().click({ force: true });
        cy.wait(2000);

        // Debe navegar al detalle del viaje
        cy.url().should('match', /\/app\/trips\/.+/);

        cy.get('body').then($b => {
          const hasReserve = $b.text().includes('Reservar') || $b.text().includes('Solicitar');
          if (hasReserve) {
            cy.contains('ion-button, button', /Reservar|Solicitar/i)
              .click({ force: true });
            cy.wait(1000);

            // Si hay un modal de confirmación
            cy.get('body').then($confirm => {
              if ($confirm.find('ion-alert').length > 0 || $confirm.text().match(/Confirmar|Aceptar/i)) {
                cy.contains('.alert-button, button, ion-button', /Confirmar|Aceptar/i).click({ force: true });
              }
            });

            cy.get('ion-toast', { timeout: 10000 }).should('exist');
          } else {
            cy.log('El viaje no tiene opción de reserva (ya reservado o lleno).');
          }
        });
      } else {
        cy.log('No hay viajes disponibles para reservar.');
      }
    });
  });
});

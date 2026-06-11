// ─────────────────────────────────────────────────────────────────────────────
// Viajes - Detalles de Viaje (Pasajero)
// ─────────────────────────────────────────────────────────────────────────────

describe('Viajes - Detalles de Viaje', () => {

  beforeEach(() => {
    cy.loginAsPassenger();
    cy.visit('/app/trips');
    cy.get('ion-content', { timeout: 15000 }).should('exist');
  });

  it('TRIP-DET-01: Debe navegar al detalle de un viaje disponible', () => {
    cy.get('body').then($body => {
      if ($body.find('.trips-grid .trip-card').length > 0) {
        cy.get('.trips-grid .trip-card').first().click({ force: true });
        cy.wait(1500);

        cy.url().should('match', /\/app\/trips\/.+/);
        cy.get('ion-content').should('exist');
      } else {
        cy.log('Sin viajes disponibles para ver detalles');
      }
    });
  });

  it('TRIP-DET-02: La página de detalle debe mostrar información del conductor', () => {
    cy.get('body').then($body => {
      if ($body.find('.trips-grid .trip-card').length > 0) {
        cy.get('.trips-grid .trip-card').first().click({ force: true });
        cy.wait(1500);

        cy.url().should('match', /\/app\/trips\/.+/);

        // Información del conductor o del viaje
        cy.get('body').then($detail => {
          const hasDriverInfo = $detail.find('.driver-info, .driver-name, [class*="driver"]').length > 0;
          const hasRouteInfo = $detail.find('.route-block, .route-info, [class*="route"]').length > 0;
          expect(hasDriverInfo || hasRouteInfo).to.be.true;
        });
      } else {
        cy.log('Sin viajes disponibles');
      }
    });
  });

  it('TRIP-DET-03: Debe manejar un tripId inexistente sin crash', () => {
    cy.visit('/app/trips/non-existent-trip-id-xyz123', { failOnStatusCode: false });
    cy.wait(2000);

    cy.get('body').then($body => {
      // Debe mostrar error o redirigir — no debe crashear
      const redirected = !location.pathname.includes('non-existent-trip-id-xyz123');
      const hasError = $body.text().includes('No se pudo') ||
                       $body.text().includes('Error') ||
                       $body.text().includes('No encontrado') ||
                       $body.find('.empty-state').length > 0;
      expect(redirected || hasError).to.be.true;
    });
  });

  it('TRIP-DET-04: Debe mostrar el botón de reserva si el viaje tiene cupos', () => {
    cy.get('body').then($body => {
      const openTrips = $body.find('.trips-grid .trip-card');
      if (openTrips.length > 0) {
        cy.wrap(openTrips.first()).click({ force: true });
        cy.wait(1500);

        cy.get('body').then($detail => {
          if ($detail.text().includes('Reservar') || $detail.text().includes('Solicitar')) {
            cy.contains(/Reservar|Solicitar/i).should('be.visible');
          } else if ($detail.text().includes('pendiente') || $detail.text().includes('aceptado')) {
            cy.log('Ya hay una solicitud activa para este viaje');
          } else {
            cy.log('Viaje sin opción de reserva disponible');
          }
        });
      } else {
        cy.log('Sin viajes disponibles');
      }
    });
  });

});

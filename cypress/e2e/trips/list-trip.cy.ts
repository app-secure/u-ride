// ─────────────────────────────────────────────────────────────────────────────
// Trips - Listar Viajes (Pasajero)
// ─────────────────────────────────────────────────────────────────────────────

describe('Viajes - Listar Viajes', () => {

  beforeEach(() => {
    cy.loginAsPassenger();
    cy.visit('/app/trips');
    cy.get('ion-content', { timeout: 15000 }).should('exist');
  });

  it('TRIP-LIST-01: Debe mostrar la pantalla de búsqueda de viajes', () => {
    cy.contains('button.nav-item', 'Buscar Viajes', { timeout: 10000 })
      .should('have.class', 'active');

    cy.get('.filters-card form').should('exist');
  });

  it('TRIP-LIST-02: Debe mostrar viajes disponibles o estado vacío', () => {
    cy.get('body').then($body => {
      if ($body.find('.trips-grid .trip-card').length > 0) {
        cy.get('.trips-grid .trip-card').first().should('be.visible');
        cy.log('Viajes encontrados correctamente');
      } else {
        // Estado vacío: "Sin resultados" o loading
        cy.get('.empty-state, .loading-state').should('exist');
      }
    });
  });

  it('TRIP-LIST-03: Debe poder cambiar al tab "Mis Viajes"', () => {
    cy.contains('button.nav-item', 'Mis Viajes', { timeout: 10000 })
      .click({ force: true });

    cy.wait(1000);
    cy.contains('h3', 'Mis Viajes').should('exist');
  });

  it('TRIP-LIST-04: El filtro de ruta debe poder abrirse', () => {
    cy.get('ion-select[formControlName="routeName"]', { timeout: 10000 })
      .should('exist')
      .click({ force: true });

    cy.wait(500);
    // Popover de ion-select
    cy.get('ion-select-popover, ion-popover').should('exist');

    // Cerrar el popover
    cy.get('body').type('{esc}');
  });

  it('TRIP-LIST-05: Debe poder navegar al detalle de un viaje', () => {
    cy.get('body').then($body => {
      if ($body.find('.trips-grid .trip-card').length > 0) {
        cy.get('.trips-grid .trip-card').first().click({ force: true });
        cy.wait(1500);

        // Debe navegar al detalle
        cy.url().should('match', /\/app\/trips\/.+/);
        cy.get('ion-content').should('exist');
      } else {
        cy.log('Sin viajes disponibles, se omite navegación al detalle');
      }
    });
  });

});

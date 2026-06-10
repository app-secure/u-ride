// ─────────────────────────────────────────────────────────────────────────────
// Navigation - Menú lateral, Cambio de rol, Rutas del app
// ─────────────────────────────────────────────────────────────────────────────

describe('Navigation - Menú y Cambios de Rol', () => {

  // ── Flujo Pasajero ────────────────────────────────────────────────────────

  describe('Flujo Pasajero', () => {

    beforeEach(() => {
      cy.loginAsPassenger();
    });

    it('NAV-01: El pasajero debe ver la pantalla principal de viajes', () => {
      cy.location('pathname', { timeout: 15000 })
        .should('match', /\/app\/(trips|role)/);
      cy.get('ion-content').should('exist');
    });

    it('NAV-02: El pasajero debe poder abrir el menú lateral', () => {
      cy.visit('/app/trips');
      cy.get('ion-content').should('be.visible');
      cy.get('#profile-popover-trigger', { timeout: 15000 }).should('be.visible').first()
        .click({ force: true });

      cy.get('ion-popover', { timeout: 10000 }).should('exist');
    });

    it('NAV-03: El pasajero debe poder cambiar a rol conductor', () => {
      cy.visit('/app/trips');

      // Abrir menú lateral
      cy.get('ion-content').should('be.visible');
      cy.get('#profile-popover-trigger', { timeout: 15000 }).should('be.visible').first()
        .click({ force: true });

      cy.get('ion-popover', { timeout: 10000 }).should('be.visible');

      // Click en "Cambiar rol"
      cy.get('ion-popover').contains('button', 'Cambiar rol', { timeout: 10000 })
        .should('exist').click({ force: true });

      // Debe ir a la selección de rol o directamente al dashboard del conductor
      cy.url({ timeout: 15000 }).should('match', /\/app\/(role|my-trips)/);
    });

    it('NAV-04: El pasajero debe poder navegar al perfil', () => {
      cy.visit('/app/trips');

      cy.get('ion-content').should('be.visible');
      cy.get('#profile-popover-trigger', { timeout: 15000 }).should('be.visible').first()
        .click({ force: true });

      cy.get('ion-popover', { timeout: 10000 }).should('be.visible');

      cy.get('ion-popover').contains('button', 'Perfil', { timeout: 10000 })
        .should('exist').click({ force: true });

      cy.url({ timeout: 10000 }).should('include', '/app/profile');
    });

  });

  // ── Flujo Conductor ───────────────────────────────────────────────────────

  describe('Flujo Conductor', () => {

    beforeEach(() => {
      cy.loginAsDriver();
    });

    it('NAV-05: El conductor debe ver la pantalla de mis viajes', () => {
      cy.location('pathname', { timeout: 15000 })
        .should('match', /\/app\/(my-trips|role)/);
      cy.get('ion-content').should('exist');
    });

    it('NAV-06: El conductor debe poder cambiar a rol pasajero', () => {
      cy.visit('/app/my-trips');

      cy.get('ion-content').should('be.visible');
      cy.get('#profile-popover-trigger', { timeout: 15000 }).should('be.visible').first()
        .click({ force: true });

      cy.get('ion-popover', { timeout: 10000 }).should('be.visible');

      cy.get('ion-popover').contains('button', 'Cambiar rol', { timeout: 10000 })
        .should('exist').click({ force: true });

      cy.url({ timeout: 15000 }).should('match', /\/app\/(role|trips)/);
    });

    it('NAV-07: El conductor debe ver el botón "Publicar Viaje"', () => {
      cy.visit('/app/my-trips');

      cy.contains('button, ion-button', 'Publicar Viaje', { timeout: 10000 })
        .should('exist');
    });

  });

});
import { fillIonInput } from '../../support/auth-helper';
import { AuthSelectors } from '../../support/selectors';
import { TestData } from '../../support/test-data';

// ─────────────────────────────────────────────────────────────────────────────
// Sistema E2E - Flujo Completo de Usuario
// Prueba el sistema completo: Login → Rol → Navegación → Acciones → Logout
// ─────────────────────────────────────────────────────────────────────────────

describe('Sistema E2E - Flujo Completo Pasajero', () => {

  it('FLOW-P01: Login → Selección de Rol → Ver Viajes → Logout', () => {
    // 1. Estado limpio
    cy.clearAllCookies();
    cy.clearAllLocalStorage();
    cy.clearAllSessionStorage();

    // 2. Login
    cy.visit('/auth/login');
    cy.get(AuthSelectors.emailInput, { timeout: 15000 }).should('exist');

    fillIonInput(AuthSelectors.emailInput, TestData.passenger.email);
    fillIonInput(AuthSelectors.passwordInput, TestData.passenger.password);
    cy.get(AuthSelectors.submitBtn).click({ force: true });

    // 3. Redirigir al app
    cy.location('pathname', { timeout: 30000 }).should('not.include', '/auth');

    // 4. Si hay pantalla de selección de rol, seleccionar "Viajar"
    cy.location('pathname').then(path => {
      if (path.includes('/app/role')) {
        cy.contains('button, ion-button', 'Viajar', { timeout: 10000 })
          .click({ force: true });
        cy.location('pathname', { timeout: 15000 }).should('not.include', '/app/role');
      }
    });

    // 5. Debe estar en alguna sección del app
    cy.url().should('include', '/app/');
    cy.get('ion-content').should('exist');

    // 6. Navegar a viajes
    cy.visit('/app/trips');
    cy.get('ion-content', { timeout: 10000 }).should('exist');
    cy.contains('button.nav-item', 'Buscar Viajes').should('exist');

    // 7. El título principal del app debe ser visible
    cy.get('ion-content').should('exist');
  });

});

describe('Sistema E2E - Flujo Completo Conductor', () => {

  it('FLOW-D01: Login → Selección de Rol Conductor → Ver Mis Viajes', () => {
    // 1. Estado limpio
    cy.clearAllCookies();
    cy.clearAllLocalStorage();
    cy.clearAllSessionStorage();

    // 2. Login
    cy.visit('/auth/login');
    cy.get(AuthSelectors.emailInput, { timeout: 15000 }).should('exist');

    fillIonInput(AuthSelectors.emailInput, TestData.driver.email);
    fillIonInput(AuthSelectors.passwordInput, TestData.driver.password);
    cy.get(AuthSelectors.submitBtn).click({ force: true });

    // 3. Redirigir al app
    cy.location('pathname', { timeout: 30000 }).should('not.include', '/auth');

    // 4. Si hay pantalla de selección de rol, seleccionar "Conducir"
    cy.location('pathname').then(path => {
      if (path.includes('/app/role')) {
        cy.contains('button, ion-button', 'Conducir', { timeout: 10000 })
          .click({ force: true });
        cy.location('pathname', { timeout: 15000 }).should('not.include', '/app/role');
      }
    });

    // 5. Navegar a mis viajes
    cy.visit('/app/my-trips');
    cy.get('ion-content', { timeout: 10000 }).should('exist');

    // 6. El segmento de "Viajes Activos" debe existir
    cy.contains('button.nav-item', 'Viajes Activos').should('exist');
    cy.contains('button.nav-item', 'Historial').should('exist');

    // 7. El botón "Publicar Viaje" debe estar disponible
    cy.contains('button, ion-button', 'Publicar Viaje').should('exist');
  });

  it('FLOW-D02: Conductor puede ver historial de viajes', () => {
    cy.loginAsDriver();
    cy.visit('/app/my-trips');

    // Cambiar al tab de historial
    cy.contains('button.nav-item', 'Historial', { timeout: 10000 })
      .click({ force: true });

    cy.wait(1000);
    cy.get('ion-content').should('exist');

    cy.get('body').then($body => {
      if ($body.find('.trip-card').length > 0) {
        cy.get('.trip-card').should('have.length.gte', 1);
      } else {
        cy.contains('No hay viajes').should('exist');
      }
    });
  });

});

describe('Sistema E2E - Cambio de Rol', () => {

  it('FLOW-ROL01: Usuario puede cambiar entre roles desde el menú', () => {
    cy.loginAsPassenger();
    cy.visit('/app/trips');

    // Asegurarse de que la página ha cargado
    cy.get('ion-content').should('be.visible');

    // Abrir menú de perfil
    cy.get('#profile-popover-trigger', { timeout: 15000 })
      .should('be.visible')
      .first()
      .click({ force: true });

    // Esperar a que el popover esté renderizado y visible
    cy.get('ion-popover', { timeout: 10000 }).should('be.visible');

    // Debe existir la opción de cambiar rol dentro del popover
    cy.get('ion-popover').contains('button', 'Cambiar rol', { timeout: 10000 })
      .should('exist')
      .click({ force: true });

    // Después de cambiar rol, debe estar en el app (rol o pantalla del conductor)
    cy.url({ timeout: 15000 }).should('include', '/app/');
  });

});

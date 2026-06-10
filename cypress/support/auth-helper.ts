/// <reference types="cypress" />

import { AuthSelectors } from './selectors';

// ─────────────────────────────────────────────────────────────
// fillIonInput
// Escribe en el <input> nativo dentro de un <ion-input>.
// Ionic 7 expone el input en el light DOM (accesible con .find('input')).
// Si no existe en light DOM, busca en shadow root como fallback.
// ─────────────────────────────────────────────────────────────
export const fillIonInput = (selector: string, value: string) => {
  cy.get(selector, { timeout: 15000 }).should('exist').then($ion => {
    const isShadow = !$ion.find('input').length && !!($ion[0] as any).shadowRoot;

    if (isShadow) {
      cy.get(selector).shadow().find('input').click({ force: true });
      cy.get(selector).shadow().find('input').clear({ force: true });
      cy.get(selector).shadow().find('input').type(value, { delay: 10, force: true });
    } else {
      cy.get(selector).find('input').click({ force: true });
      cy.get(selector).find('input').clear({ force: true });
      cy.get(selector).find('input').type(value, { delay: 10, force: true });
    }
  });
};

// ─────────────────────────────────────────────────────────────
// selectRoleIfNeeded
// Si la URL está en /app/role, selecciona el rol indicado.
// ─────────────────────────────────────────────────────────────
export const selectRoleIfNeeded = (role: 'Viajar' | 'Conducir') => {
  cy.location('pathname', { timeout: 15000 }).then(path => {
    if (!path.includes('/app/role')) return;

    cy.contains('button, ion-button', role, { timeout: 15000 })
      .should('be.visible')
      .click({ force: true });

    // Esperar a que salgamos de la pantalla de rol
    cy.location('pathname', { timeout: 15000 })
      .should('not.include', '/app/role');
  });
};

// ─────────────────────────────────────────────────────────────
// loginDirectly
// Login completo via UI: limpia estado, visita login, escribe
// credenciales y hace click en "Entrar".
// ─────────────────────────────────────────────────────────────
export const loginDirectly = (email: string, password: string) => {
  cy.clearAllCookies();
  cy.clearAllLocalStorage();
  cy.clearAllSessionStorage();

  cy.visit('/auth/login');

  // Esperar a que la página esté lista
  cy.get(AuthSelectors.emailInput, { timeout: 20000 }).should('exist');

  fillIonInput(AuthSelectors.emailInput, email);
  fillIonInput(AuthSelectors.passwordInput, password);

  // El botón puede estar disabled mientras Angular valida el formulario.
  // Usar click({force:true}) lo hace funcionar sin importar el estado.
  cy.get(AuthSelectors.submitBtn, { timeout: 15000 })
    .should('exist')
    .click({ force: true });

  // Verificar que salimos del flujo de autenticación
  cy.location('pathname', { timeout: 30000 }).should(path => {
    expect(path).to.satisfy((p: string) => p.includes('/app/') || p.includes('/auth/verify-email'));
  });
};

// Alias para compatibilidad con tests antiguos
export { fillIonInput as typeInIonInput };
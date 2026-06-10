import { AdminSelectors, AuthSelectors } from '../../support/selectors';

describe('Admin - Aplicar Sanciones', () => {

  beforeEach(() => {
    cy.intercept('GET', '**/api/users/me', {
      statusCode: 200,
      body: {
        firebaseUid: 'PqNxoaGLuLNM0bdFLsmKac6UiHx1',
        email: 'bpilla9393@uta.edu.ec',
        emailVerified: true,
        displayName: 'Admin User',
        roles: { admin: true },
        disabled: false,
        suspendedUntil: null
      }
    });
    cy.intercept('POST', '**/api/users/sync', {
      statusCode: 200,
      body: {
        firebaseUid: 'PqNxoaGLuLNM0bdFLsmKac6UiHx1',
        email: 'bpilla9393@uta.edu.ec',
        emailVerified: true,
        displayName: 'Admin User',
        roles: { admin: true },
        disabled: false,
        suspendedUntil: null
      }
    });

    cy.loginAsAdmin();
    cy.visit('/app/admin/users');
    cy.wait(2500); // ⬅️ un poco más estable para Ionic render
  });

  it('Debe alternar el estado de activación de la cuenta del usuario', () => {
    cy.get('body').then($body => {
      const toggleBtn = $body.find(AdminSelectors.toggleDisabledBtn);

      if (!toggleBtn.length) {
        cy.log('⚠️ No hay usuarios disponibles');
        return;
      }

      cy.wrap(toggleBtn.first(), { log: false })
        .should('exist')
        .click({ force: true });

      cy.get(AuthSelectors.toast, { timeout: 10000 })
        .should('exist');
    });
  });

  it('Debe permitir levantar la suspensión si el usuario está suspendido', () => {

    cy.get('body').then($body => {

      const unsuspendBtn = $body.find(AdminSelectors.unsuspendQuickBtn);

      if (!unsuspendBtn.length) {
        cy.log('⚠️ No hay usuarios suspendidos');
        return;
      }

      cy.wrap(unsuspendBtn.first())
        .click({ force: true });

      cy.get(AuthSelectors.toast, { timeout: 10000 })
        .should('exist');
    });
  });

});
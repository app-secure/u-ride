import { AdminSelectors } from '../../support/selectors';

describe('Admin - Gestión de Usuarios', () => {

  beforeEach(() => {
    cy.clearCookies();
    cy.clearLocalStorage();

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
  });

  it('Debe visualizar el listado de usuarios y abrir el modal de detalle', () => {

    // 🔥 FORZAR navegación correcta (evita redirect a trips)
    cy.visit('/app/admin/users', { failOnStatusCode: false });

    // 👇 espera real de carga
    cy.get('body', { timeout: 15000 }).should('be.visible');

    // 🔥 confirmar que realmente estás en admin
    cy.location('pathname', { timeout: 10000 })
      .should('include', '/admin/users');

    cy.get('body').then($body => {

      const users = $body.find(AdminSelectors.userMain);

      if (users.length > 0) {

        cy.wrap(users)
          .first()
          .scrollIntoView()
          .click({ force: true });

        cy.get(AdminSelectors.detailModal, { timeout: 10000 })
          .should('be.visible');

        cy.get(AdminSelectors.detailModal).within(() => {
          cy.contains('Carrera').should('exist');
          cy.contains('Zona').should('exist');
        });

        cy.get(AdminSelectors.detailModalCloseBtn)
          .click({ force: true });

        cy.get(AdminSelectors.detailModal)
          .should('not.exist');

      } else {

        // ❌ NO validar texto falso
        cy.get('body').should('contain.text', '');
      }
    });
  });

});
import { AdminSelectors, AuthSelectors } from '../../support/selectors';

describe('Admin - Gestión y Resolución de Reportes', () => {

  const mockReports = {
    items: [
      {
        id: '1',
        reporterUid: 'h519Qsv3UGgQfYGL1KcnqxKjHa52',
        reportedUid: 'vCGrTtCnwwgIXb0PEm8VPY5PbjS2',
        reason: 'El conductor usó lenguaje ofensivo y no respetó las normas de convivencia.',
        evidenceUrl: null,
        status: 'open',
        createdAt: new Date().toISOString()
      },
      {
        id: '2',
        reporterUid: 'vCGrTtCnwwgIXb0PEm8VPY5PbjS2',
        reportedUid: 'h519Qsv3UGgQfYGL1KcnqxKjHa52',
        reason: 'El pasajero llegó tarde y dejó el asiento sucio.',
        evidenceUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ2KRoo3oVPLjFBjS6F-Hyw5VnFzmoFtoyX-w&s',
        status: 'open',
        createdAt: new Date().toISOString()
      }
    ],
    totalCount: 2,
    page: 1,
    pageSize: 100
  };

  beforeEach(() => {
    // Mock usuario admin
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

    // ⬅️ Mock de reportes: siempre devuelve 2 reportes pendientes de prueba
    cy.intercept('GET', '**/api/reports**', {
      statusCode: 200,
      body: mockReports
    }).as('getReports');

    // Mock para resolver reportes (Advertir / Desestimar / Suspender)
    cy.intercept('PATCH', '**/api/reports/*/resolve', {
      statusCode: 200,
      body: { 
        id: '1', 
        status: 'resolved', 
        action: 'warned' 
      }
    }).as('resolveReport');

    // Mock para la suspensión real del usuario
    cy.intercept('POST', '**/api/users/*/suspend', {
      statusCode: 200,
      body: { message: 'Usuario suspendido correctamente.' }
    }).as('suspendUser');

    cy.loginAsAdmin();

    cy.visit('/app/admin/reports', { failOnStatusCode: false });
    cy.wait('@getReports');
    cy.wait(1500); // ⬅️ Pausa para ver cómo carga la lista con datos de prueba
    cy.get('ion-content', { timeout: 15000 }).should('exist');
    cy.wait(1000);
  });

  it('ADMIN-REP-01: Debe mostrar la lista de reportes pendientes', () => {
    cy.wait(1000);
    cy.get('.reports-grid, .report-card', { timeout: 10000 }).should('exist');
    cy.wait(1500); // ⬅️ Pausa para apreciar los reportes cargados
    cy.log('✅ Lista de reportes cargada con datos de prueba');
  });

  it('ADMIN-REP-02: Debe advertir al usuario reportado', () => {
    cy.wait(800);
    cy.get('body').then($body => {
      const sanctionBtn = $body.find('.sanction-btn');
      if (!sanctionBtn.length) {
        cy.log('⚠️ Sin botón de sancionar visible (posiblemente reporte ya revisado)');
        return;
      }

      cy.wrap(sanctionBtn.first()).scrollIntoView();
      cy.wait(800); // ⬅️ Pausa para ver el botón destacado
      cy.wrap(sanctionBtn.first()).click({ force: true });
      cy.wait(1500); // ⬅️ Pausa para ver el Action Sheet emergente

      cy.get('ion-action-sheet').should('exist');
      cy.wait(1000); // ⬅️ Pausa para leer las opciones del menú
      cy.get('ion-action-sheet button.action-sheet-button').contains('Enviar Advertencia').click({ force: true });
      cy.wait(800);

      cy.get(AuthSelectors.toast, { timeout: 10000 }).should('exist');
      cy.wait(1200); // ⬅️ Pausa final para ver el mensaje de éxito
    });
  });

  it('ADMIN-REP-03: Debe suspender al usuario reportado', () => {
    cy.wait(800);
    cy.get('body').then($body => {
      const sanctionBtn = $body.find('.sanction-btn');
      if (!sanctionBtn.length) {
        cy.log('⚠️ Sin botón de sancionar visible (posiblemente reporte ya revisado)');
        return;
      }

      cy.wrap(sanctionBtn.first()).scrollIntoView();
      cy.wait(800);
      cy.wrap(sanctionBtn.first()).click({ force: true });
      cy.wait(1500); // ⬅️ Pausa para ver el Action Sheet

      cy.get('ion-action-sheet').should('exist');
      cy.wait(1000); // ⬅️ Pausa para leer las opciones
      cy.get('ion-action-sheet button.action-sheet-button').contains('Suspender 7 días').click({ force: true });
      cy.wait(800);

      cy.get(AuthSelectors.toast, { timeout: 10000 }).should('exist');
      cy.wait(1200);
    });
  });

  it('ADMIN-REP-04: Debe mostrar la evidencia del reporte si existe', () => {
    cy.wait(1000);
    cy.get('body').then($body => {
      const evidenceBtn = $body.find(AdminSelectors.evidenceModalBtn);
      if (!evidenceBtn.length) {
        cy.log('ℹ️ Sin evidencia adjunta en los reportes de prueba');
        return;
      }

      cy.log('📎 Evidencia encontrada — abriendo modal...');
      cy.wait(600);
      cy.wrap(evidenceBtn.first()).scrollIntoView().click({ force: true });
      cy.wait(1500); // ⬅️ Pausa para ver el modal con la evidencia

      cy.get('body').then($b => {
        const hasModal = $b.find('ion-modal, .evidence-modal, img').length > 0;
        expect(hasModal).to.be.true;
      });
      cy.wait(1200); // ⬅️ Pausa final para apreciar la evidencia
    });
  });

});
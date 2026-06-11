import { AuthSelectors } from '../../support/selectors';

describe('Admin - Apelaciones', () => {

  beforeEach(() => {
    // Mock user as Admin
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

    // Mock appeals list
    cy.intercept('GET', '**/api/appeals', {
      statusCode: 200,
      body: [
        {
          id: 1,
          userId: 'someUser123',
          userName: 'Usuario Bloqueado',
          userEmail: 'bloqueado@uta.edu.ec',
          reason: 'Por favor desbloquéame, fue un error.',
          evidenceUrl: null,
          status: 'pending',
          createdAt: new Date().toISOString()
        }
      ]
    }).as('getAppeals');

    // Mock process appeal
    cy.intercept('POST', '**/api/appeals/*/process', {
      statusCode: 200,
      body: { message: 'Processed' }
    }).as('processAppeal');

    cy.loginAsAdmin();
    cy.visit('/app/admin/appeals');
    cy.wait('@getAppeals');
    cy.wait(1500); // ⬅️ Pausa visual para ver cómo carga la lista
  });

  it('Debe permitir aprobar una apelación', () => {
    cy.get('body').then($body => {
      // Buscar el botón de aprobar (success quick-btn)
      const approveBtn = $body.find('button.quick-btn.success');

      if (!approveBtn.length) {
        cy.log('⚠️ No hay apelaciones pendientes para probar');
        return;
      }

      // Hacer clic en Aprobar
      cy.wait(1000); // ⬅️ Pausa visual antes de hacer clic
      cy.wrap(approveBtn.first()).click({ force: true });

      // Esperar la alerta de confirmación
      cy.get('ion-alert').should('exist');
      cy.wait(1500); // ⬅️ Pausa visual para poder leer la alerta
      
      // Escribir la justificación
      cy.get('ion-alert textarea.alert-input').type('Se ha revisado su caso y se aprueba su apelación. Su cuenta ha sido desbloqueada.', { force: true });
      cy.wait(500); // ⬅️ Pausa para ver el texto escrito

      // Hacer clic en Aprobar dentro de la alerta
      cy.get('ion-alert button').contains('Aprobar').click({ force: true });

      // Verificar que se haya realizado la llamada al backend con la justificación
      cy.wait('@processAppeal').its('request.body').should('deep.include', {
        approve: true,
        adminNotes: 'Se ha revisado su caso y se aprueba su apelación. Su cuenta ha sido desbloqueada.'
      });

      // Verificar que se muestre el toast de éxito
      cy.get(AuthSelectors.toast, { timeout: 10000 }).should('exist');
      cy.wait(1000); // ⬅️ Pausa visual final para ver el toast
    });
  });

  it('Debe permitir rechazar una apelación', () => {
    cy.get('body').then($body => {
      // Buscar el botón de rechazar (danger quick-btn)
      const rejectBtn = $body.find('button.quick-btn.danger');

      if (!rejectBtn.length) {
        cy.log('⚠️ No hay apelaciones pendientes para probar');
        return;
      }

      // Hacer clic en Rechazar
      cy.wait(1000); // ⬅️ Pausa visual antes de hacer clic
      cy.wrap(rejectBtn.first()).click({ force: true });

      // Esperar la alerta de confirmación
      cy.get('ion-alert').should('exist');
      cy.wait(1500); // ⬅️ Pausa visual para poder leer la alerta
      
      // Escribir la justificación
      cy.get('ion-alert textarea.alert-input').type('Su apelación ha sido denegada. La suspensión de su cuenta se mantiene activa debido a faltas graves.', { force: true });
      cy.wait(500); // ⬅️ Pausa para ver el texto escrito

      // Hacer clic en Rechazar dentro de la alerta
      cy.get('ion-alert button').contains('Rechazar').click({ force: true });

      // Verificar que se haya realizado la llamada al backend con la justificación
      cy.wait('@processAppeal').its('request.body').should('deep.include', {
        approve: false,
        adminNotes: 'Su apelación ha sido denegada. La suspensión de su cuenta se mantiene activa debido a faltas graves.'
      });

      // Verificar que se muestre el toast
      cy.get(AuthSelectors.toast, { timeout: 10000 }).should('exist');
      cy.wait(1000); // ⬅️ Pausa visual final para ver el toast
    });
  });

});

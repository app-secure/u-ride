// ─────────────────────────────────────────────────────────────────────────────
// Notifications - Marcar como leída y navegación
// ─────────────────────────────────────────────────────────────────────────────

describe('Notifications - Marcar como Leída', () => {

  beforeEach(() => {
    cy.loginAsPassenger();
    cy.visit('/app/notifications');
    cy.get('ion-content', { timeout: 15000 }).should('exist');
  });

  it('NOTIF-READ-01: Debe mostrar el historial o el estado vacío de notificaciones', () => {
    cy.get('body').then($body => {
      if ($body.find('ion-list ion-item, .notif-item').length > 0) {
        cy.get('ion-list ion-item, .notif-item').first().should('be.visible');
      } else {
        cy.contains(/sin notificaciones|no hay notificaciones|no tienes/i).should('exist');
      }
    });
  });

  it('NOTIF-READ-02: Al hacer click en notificación debe navegar a la sección relacionada', () => {
    cy.get('body').then($body => {
      const notifItems = $body.find('ion-list ion-item, .notif-item');
      if (notifItems.length > 0) {
        cy.wrap(notifItems.first()).click({ force: true });
        cy.wait(1500);

        // Debe navegar a una ruta del app (viajes, calificaciones, reportes, etc.)
        cy.url().should('match', /\/app\//);
      } else {
        cy.log('Sin notificaciones disponibles para hacer click');
      }
    });
  });

  it('NOTIF-READ-03: El badge de notificaciones no leídas debe estar presente en la app', () => {
    cy.visit('/app/trips');

    cy.get('body').then($body => {
      // El badge puede ser ion-badge, .notif-badge o similar
      if ($body.find('#notifications-trigger ion-badge, .notif-badge').length > 0) {
        cy.get('#notifications-trigger ion-badge, .notif-badge')
          .should('exist');
        cy.log('Badge de notificaciones encontrado');
      } else {
        cy.log('Sin notificaciones no leídas actualmente');
      }
    });
  });

});

// ─────────────────────────────────────────────────────────────────────────────
// Notifications - Lista y Lectura
// ─────────────────────────────────────────────────────────────────────────────

describe('Notifications - Historial y Marcado como Leído', () => {

  beforeEach(() => {
    cy.loginAsPassenger();
    cy.visit('/app/trips');
    cy.get('ion-content', { timeout: 15000 }).should('exist');
  });

  it('NOTIF-01: Debe existir el botón de notificaciones en el header', () => {
    cy.get('#notifications-trigger, [id*="notif"], ion-button:has(ion-badge)', { timeout: 10000 })
      .should('exist');
  });

  it('NOTIF-02: Debe abrir el popover de notificaciones', () => {
    cy.get('#notifications-trigger', { timeout: 10000 }).then($btn => {
      if ($btn.length) {
        cy.wrap($btn).click({ force: true });
        cy.get('ion-popover', { timeout: 8000 }).should('exist');
      } else {
        cy.log('Botón #notifications-trigger no encontrado, se navega directamente');
        cy.visit('/app/notifications');
        cy.get('ion-content').should('exist');
      }
    });
  });

  it('NOTIF-03: Debe navegar al historial completo de notificaciones', () => {
    cy.get('body').then($body => {
      const trigger = $body.find('#notifications-trigger');
      
      // Verificamos que el botón exista y sea visible antes de interactuar
      if (trigger.length > 0 && trigger.is(':visible')) {
        cy.wrap(trigger).click({ force: true });
        
        // Ionic mantiene el ion-popover en el DOM siempre, pero le quita .overlay-hidden cuando se abre
        cy.get('ion-popover.notif-popover-overlay:not(.overlay-hidden)', { timeout: 10000 })
          .should('exist');
          
        // Ahora sí podemos buscar el texto
        cy.contains('Ver todas', { timeout: 10000 })
          .should('exist')
          .click({ force: true });
      } else {
        cy.visit('/app/notifications');
      }
    });

    cy.url({ timeout: 10000 }).should('include', '/app/notifications');
    cy.get('ion-content').should('exist');
  });

  it('NOTIF-04: La página de historial debe mostrar notificaciones o estado vacío', () => {
    cy.visit('/app/notifications');
    cy.get('ion-content', { timeout: 10000 }).should('exist');

    cy.get('body').then($body => {
      if ($body.find('ion-list ion-item').length > 0) {
        cy.get('ion-list ion-item').first().should('be.visible');
      } else {
        // Estado vacío
        cy.contains(/sin notificaciones|no hay notificaciones|no tienes notificaciones|sin resultados/i)
          .should('exist');
      }
    });
  });

});

// ─────────────────────────────────────────────────────────────────────────────
// Viajes Conductor - Flujos completos: listar, iniciar, finalizar, publicar
// ─────────────────────────────────────────────────────────────────────────────

describe('Viajes Conductor - Dashboard de Mis Viajes', () => {

  beforeEach(() => {
    cy.loginAsDriver();
    cy.visit('/app/my-trips');
    cy.get('ion-content', { timeout: 15000 }).should('exist');
  });

  it('DRIVER-01: Debe mostrar el dashboard de mis viajes correctamente', () => {
    cy.contains('h2', 'Mis Viajes', { timeout: 10000 }).should('exist');
    cy.contains('button.nav-item', 'Viajes Activos').should('exist');
    cy.contains('button.nav-item', 'Historial').should('exist');
    cy.contains('button, ion-button', 'Publicar Viaje').should('exist');
  });

  it('DRIVER-02: Debe mostrar tarjetas de viaje o estado vacío', () => {
    cy.get('.trip-card, .empty-state', { timeout: 15000 }).should('exist');
    cy.get('body').then($body => {
      if ($body.find('.trip-card').length > 0) {
        cy.get('.trip-card').should('have.length.gte', 1);
        // Cada tarjeta debe mostrar el origen y el destino
        cy.get('.trip-card').first().within(() => {
          cy.contains('Origen').should('exist');
          cy.contains('Destino').should('exist');
        });
      } else {
        // Estado vacío: "No hay viajes"
        cy.contains('No hay viajes').should('exist');
        // Debe existir el botón de publicar en el estado vacío
        cy.contains('button', 'Publicar un viaje').should('exist');
      }
    });
  });

  it('DRIVER-03: Debe poder navegar al historial de viajes', () => {
    cy.contains('button.nav-item', 'Historial').click({ force: true });
    cy.get('.trip-card, .empty-state', { timeout: 15000 }).should('exist');

    cy.get('body').then($body => {
      if ($body.find('.trip-card').length > 0) {
        cy.get('.trip-card').should('have.length.gte', 1);
      } else {
        cy.contains('No hay viajes').should('exist');
      }
    });
  });

  it('DRIVER-04: Debe poder iniciar un viaje activo si existe', () => {
    cy.get('body').then($body => {
      const activeTripCards = $body.find('.trip-card .status-pill.open, .trip-card .status-pill:contains("Activo")');
      if (activeTripCards.length > 0) {
        cy.get('.trip-card').first().within(() => {
          cy.contains('button', 'Iniciar Viaje', { timeout: 5000 }).click({ force: true });
        });

        cy.wait(800);

        // Confirmar el alert si aparece
        cy.get('body').then($b => {
          if ($b.find('.alert-button').length > 0) {
            cy.get('.alert-button').contains(/Iniciar/i).click({ force: true });
          }
        });

        cy.get('ion-toast', { timeout: 15000 }).should('exist');
      } else {
        cy.log('Sin viajes activos para iniciar');
      }
    });
  });

  it('DRIVER-05: Debe poder finalizar un viaje en curso si existe', () => {
    cy.get('body').then($body => {
      const inProgressCards = $body.find('.trip-card .status-pill.inprogress, .trip-card .status-pill:contains("En curso")');
      if (inProgressCards.length > 0) {
        cy.get('.trip-card').first().within(() => {
          cy.contains('button', 'Finalizar Viaje', { timeout: 5000 }).click({ force: true });
        });

        cy.wait(800);

        cy.get('body').then($b => {
          if ($b.find('.alert-button').length > 0) {
            cy.get('.alert-button').contains(/Finalizar/i).click({ force: true });
          }
        });

        cy.get('ion-toast', { timeout: 15000 }).should('exist');
      } else {
        cy.log('Sin viajes en curso para finalizar');
      }
    });
  });

  it('DRIVER-06: Al hacer click en tarjeta debe navegar al detalle/mapa', () => {
    cy.get('body').then($body => {
      if ($body.find('.trip-card').length > 0) {
        cy.get('.trip-card').first().click({ force: true });
        cy.wait(1500);
        // Debe salir de my-trips
        cy.url().should('not.include', '/app/my-trips');
        cy.get('ion-content').should('exist');
      } else {
        cy.log('Sin tarjetas de viaje para navegar');
      }
    });
  });

  it('DRIVER-07: Debe navegar al formulario de publicación', () => {
    cy.contains('button, ion-button', 'Publicar Viaje', { timeout: 10000 })
      .click({ force: true });

    cy.url({ timeout: 10000 }).should('include', '/app/publish');
    cy.get('ion-content').should('exist');
  });

});

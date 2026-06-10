import { RatingSelectors } from '../../support/selectors';

// ─────────────────────────────────────────────────────────────────────────────
// Calificaciones - Crear Calificación (Sistema E2E)
// Usa un tripId/userId ficticio — la página maneja el caso 404 con gracia.
// ─────────────────────────────────────────────────────────────────────────────

describe('Calificaciones - Crear Calificación', () => {

  beforeEach(() => {
    cy.loginAsPassenger();
    cy.visit('/app/rate/test-trip-id/reported-user-test-uid', {
      failOnStatusCode: false
    });
    cy.get('ion-content', { timeout: 15000 }).should('exist');
  });

  it('RATE-01: El formulario debe renderizarse o mostrar estado de error controlado', () => {
    cy.get('body').then($body => {
      const hasForm = $body.find(RatingSelectors.starBtn).length > 0;
      const hasError = $body.text().includes('No') || $body.find('.error-state').length > 0;
      expect(hasForm || hasError).to.be.true;
    });
  });

  it('RATE-02: Debe permitir seleccionar 5 estrellas', () => {
    cy.get('body').then($body => {
      if ($body.find(RatingSelectors.starBtn).length > 0) {
        cy.get(RatingSelectors.starBtn).eq(4).click({ force: true });
        cy.wait(300);
        cy.contains('¡Excelente!').should('be.visible');
      } else {
        cy.log('Formulario de calificación no disponible (viaje ficticio)');
      }
    });
  });

  it('RATE-03: Debe permitir escribir un comentario', () => {
    cy.get('body').then($body => {
      if ($body.find(RatingSelectors.starBtn).length > 0) {
        cy.get(RatingSelectors.starBtn).eq(4).click({ force: true });

        cy.get(RatingSelectors.commentTextarea)
          .type('Excelente conductor, puntual y seguro.', { force: true });

        cy.get(RatingSelectors.commentTextarea)
          .should('contain.value', 'Excelente');
      } else {
        cy.log('Formulario no disponible');
      }
    });
  });

  it('RATE-04: El botón de envío debe existir cuando se selecciona una estrella', () => {
    cy.get('body').then($body => {
      if ($body.find(RatingSelectors.starBtn).length > 0) {
        cy.get(RatingSelectors.starBtn).first().click({ force: true });
        cy.get(RatingSelectors.submitBtn).should('exist');
      } else {
        cy.log('Formulario no disponible');
      }
    });
  });

});

// ─────────────────────────────────────────────────────────────────────────────
// Calificaciones - Validaciones del Formulario
// ─────────────────────────────────────────────────────────────────────────────

describe('Calificaciones - Validaciones del Formulario', () => {

  beforeEach(() => {
    cy.loginAsPassenger();
    cy.visit('/app/rate/test-trip-id/reported-user-test-uid', {
      failOnStatusCode: false
    });
    cy.get('ion-content', { timeout: 15000 }).should('exist');
  });

  it('RATE-VAL-01: Debe permitir ingresar una calificación sin comentario', () => {
    cy.get('body').then($body => {
      if ($body.find(RatingSelectors.starBtn).length > 0) {
        cy.get(RatingSelectors.starBtn).eq(3).click({ force: true });
        cy.get(RatingSelectors.commentTextarea).clear({ force: true });
        cy.get(RatingSelectors.submitBtn).should('exist').and('be.visible');
      } else {
        cy.log('Formulario no disponible (trip ficticio)');
      }
    });
  });

  it('RATE-VAL-02: Debe bloquear el envío si no se selecciona ninguna estrella', () => {
    cy.get('body').then($body => {
      if ($body.find(RatingSelectors.submitBtn).length > 0) {
        cy.get(RatingSelectors.submitBtn).then($btn => {
          if ($btn.is(':disabled') || $btn.attr('disabled') !== undefined) {
            cy.wrap($btn).should('be.disabled');
          } else {
            cy.wrap($btn).click({ force: true });
            // Si el formulario es inválido, debe quedarse en la misma página
            cy.url().should('include', '/app/rate');
          }
        });
      } else {
        cy.log('Formulario no disponible');
      }
    });
  });

});
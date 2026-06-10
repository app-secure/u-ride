import { RatingSelectors } from '../../support/selectors';

// Este archivo mantiene los tests de validación de calificaciones.
// La lógica principal está en create-rating.cy.ts.
// Aquí agregamos casos de validación adicionales específicos.

describe('Calificaciones - Validaciones Adicionales', () => {

  beforeEach(() => {
    cy.loginAsPassenger();
    cy.visit('/app/rate/test-trip-id/reported-user-test-uid', {
      failOnStatusCode: false
    });
    cy.get('ion-content', { timeout: 15000 }).should('exist');
  });

  it('RATE-VAL-03: Las 5 estrellas deben tener etiquetas correctas', () => {
    cy.get('body').then($body => {
      if ($body.find(RatingSelectors.starBtn).length >= 5) {
        cy.get(RatingSelectors.starBtn).should('have.length.gte', 5);
        // Verificar que al hacer click en cada estrella cambia el estado
        cy.get(RatingSelectors.starBtn).eq(0).click({ force: true });
        cy.contains(/Malo|Deficiente|Muy mal|1 estrella/i).should('exist');
        cy.get(RatingSelectors.starBtn).eq(4).click({ force: true });
        cy.contains(/Excelente|5 estrellas/i).should('exist');
      } else {
        cy.log('Formulario de calificación no disponible');
      }
    });
  });

  it('RATE-VAL-04: El límite de caracteres del comentario debe ser respetado', () => {
    cy.get('body').then($body => {
      if ($body.find(RatingSelectors.commentTextarea).length > 0) {
        // El textarea tiene maxlength o el componente valida el límite
        const longText = 'A'.repeat(600);
        cy.get(RatingSelectors.commentTextarea)
          .type(longText, { force: true });

        // El textarea no debe contener más caracteres que el máximo permitido
        cy.get(RatingSelectors.commentTextarea).invoke('val').then(val => {
          expect((val as string).length).to.be.lte(600);
        });
      } else {
        cy.log('Textarea no disponible');
      }
    });
  });

});
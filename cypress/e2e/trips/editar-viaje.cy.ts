import { loginAndNavigateTo, clickIonButton, typeInIonInput } from './trips-helper';

describe('Viajes - Editar Viaje', () => {

  beforeEach(() => {
    loginAndNavigateTo('Conducir', '/app/my-trips');
  });

  it('Debe editar el precio y los cupos de un viaje existente', () => {
    cy.wait(2000);

    // Clic en Editar Viaje en la primera tarjeta
    cy.get('.trip-card').first().contains('ion-button', 'Editar').click({ force: true });
    cy.wait(2000);

    // Esperar a que el formulario cargue los datos del viaje
    cy.get('input[formControlName="seatsTotal"]', { timeout: 10000 }).should('not.have.value', '');

    // Re-seleccionar vehículo para asegurar que sea válido
    cy.contains('label', 'Selecciona un vehículo').parent().find('ion-select').click({ force: true });
    cy.wait(1000);
    cy.get('ion-radio').last().click({ force: true });
    cy.wait(500);

    // Modificar cupos disponibles
    cy.get('input[formControlName="seatsTotal"]').clear({ force: true }).type('2', { force: true });

    // Modificar precio
    cy.get('input[formControlName="price"]').clear({ force: true }).type('2.00', { force: true });

    // Forzar scroll hacia abajo en Ionic (usar el último ion-content visible)
    cy.get('ion-content').last().scrollTo('bottom', { ensureScrollable: false });
    cy.wait(500);

    // Re-seleccionar el método de pago por si el cambio de estado (disabled -> enabled) borró su valor internamente
    cy.get('ion-select[formControlName="paymentMethod"]').click({ force: true });
    cy.wait(1000);
    cy.contains('ion-radio', 'Efectivo').click({ force: true });
    cy.wait(500);

    // Asegurar que el botón no esté deshabilitado antes de enviar
    cy.get('ion-button[type="submit"]').should('not.have.attr', 'disabled');

    // Enviar el formulario directamente
    cy.get('form.publish-form').submit();

    // Verificación de debug: Si el formulario es inválido, markAllAsTouched mostrará los errores.
    // Esto hará que Cypress falle aquí mismo y nos diga EXACTAMENTE qué campo está fallando.
    cy.get('.error-msg:visible', { timeout: 2000 }).should('not.exist');

    // Verificar mensaje de éxito
    cy.get('ion-toast', { timeout: 10000 }).should('exist');
    cy.url().should('include', '/app/my-trips');
  });
});

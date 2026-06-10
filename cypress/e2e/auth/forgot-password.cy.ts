import { AuthSelectors } from '../../support/selectors';
import { TestData } from '../../support/test-data';
import { typeInIonInput, clickIonButton } from '../../support/trips-helper';

describe('Auth - Recuperación de Contraseña', () => {
  beforeEach(() => {
    cy.visit('/auth/forgot-password');
    cy.wait(1000);
  });

  it('Debe enviar correo de recuperación con email institucional válido', () => {
    typeInIonInput(AuthSelectors.emailInput, TestData.passenger.email);
    clickIonButton('Enviar');

    cy.get(AuthSelectors.toast, { timeout: 8000 }).should('exist');
  });
});

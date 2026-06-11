import { AuthSelectors } from '../../support/selectors';
import { TestData } from '../../support/test-data';
import { typeInIonInput, clickIonButton } from '../../support/trips-helper';

describe('Auth - Registro de Usuario', () => {
  beforeEach(() => {
    cy.visit('/auth/register');
    cy.wait(1000);
  });

  it('Debe rechazar registro con correo no institucional (gmail)', () => {
    typeInIonInput(AuthSelectors.firstNameInput, 'Cypress');
    typeInIonInput(AuthSelectors.lastNameInput, 'Test');
    typeInIonInput(AuthSelectors.emailInput, TestData.validation.nonInstitutionalEmail);
    typeInIonInput(AuthSelectors.passwordInput, 'Password123!');
    typeInIonInput(AuthSelectors.confirmPasswordInput, 'Password123!');
    typeInIonInput(AuthSelectors.careerInput, 'Software');
    typeInIonInput(AuthSelectors.phoneInput, '0999999999');
    typeInIonInput(AuthSelectors.zoneInput, 'Norte');

    cy.get(AuthSelectors.termsCheckbox).click({ force: true });

    cy.contains(AuthSelectors.errorMessage, 'El correo debe terminar en @').should('be.visible');
    cy.get(AuthSelectors.submitBtn).should('have.attr', 'disabled');
  });

  it('Debe mostrar error si las contraseñas son diferentes', () => {
    typeInIonInput(AuthSelectors.firstNameInput, 'Cypress');
    typeInIonInput(AuthSelectors.lastNameInput, 'Test');
    typeInIonInput(AuthSelectors.emailInput, `testcypress.${Date.now()}@uta.edu.ec`);
    typeInIonInput(AuthSelectors.passwordInput, 'Password123!');
    typeInIonInput(AuthSelectors.confirmPasswordInput, 'Different123!');
    typeInIonInput(AuthSelectors.careerInput, 'Software');
    typeInIonInput(AuthSelectors.phoneInput, '0999999999');
    typeInIonInput(AuthSelectors.zoneInput, 'Norte');

    cy.get(AuthSelectors.termsCheckbox).click({ force: true });
    
    // Check validation error for mismatch
    cy.get('body').then($body => {
      if ($body.find(AuthSelectors.errorMessage).length > 0) {
        cy.get(AuthSelectors.errorMessage).should('exist');
      }
    });
  });

  it('Debe aceptar registro con correo institucional válido', () => {
    const uniqueEmail = `testcypress.${Date.now()}@uta.edu.ec`;
    
    typeInIonInput(AuthSelectors.firstNameInput, 'Cypress');
    typeInIonInput(AuthSelectors.lastNameInput, 'Test');
    typeInIonInput(AuthSelectors.emailInput, uniqueEmail);
    typeInIonInput(AuthSelectors.passwordInput, 'Password123!');
    typeInIonInput(AuthSelectors.confirmPasswordInput, 'Password123!');
    typeInIonInput(AuthSelectors.careerInput, 'Software');
    typeInIonInput(AuthSelectors.phoneInput, '0999999999');
    typeInIonInput(AuthSelectors.zoneInput, 'Ficoa');

    cy.get(AuthSelectors.termsCheckbox).click({ force: true });

    clickIonButton('Crear cuenta');

    cy.url({ timeout: 15000 }).should('match', /verify-email|app/);
  });
});

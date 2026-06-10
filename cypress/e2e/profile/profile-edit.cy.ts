import { ProfileSelectors, AuthSelectors } from '../../support/selectors';
import { typeInIonInput, clickIonButton } from '../../support/trips-helper';

describe('Perfil - Edición de Perfil', () => {
  beforeEach(() => {
    cy.loginAsPassenger();
    cy.visit('/app/profile');
    cy.wait(1500);
  });

  it('Debe actualizar la zona de referencia del perfil correctamente', () => {
    clickIonButton('Editar');
    typeInIonInput(ProfileSelectors.zoneInput, 'Huachi Grande');
    
    // Save profile changes
    cy.get(ProfileSelectors.saveBtn).click({ force: true });
    
    cy.get(AuthSelectors.toast, { timeout: 8000 }).should('exist');
  });

  it('No debe permitir guardar si un campo obligatorio como la zona está vacío', () => {
    clickIonButton('Editar');
    
    cy.get(ProfileSelectors.zoneInput).then($el => {
      const input = $el[0].shadowRoot ? cy.wrap($el).shadow().find('input') : cy.wrap($el).find('input');
      input.clear({ force: true });
    });
    cy.wait(1000);

    // Save button should be disabled, or submit should not route away/trigger success
    cy.get(ProfileSelectors.saveBtn).then($btn => {
      if ($btn.is(':disabled') || $btn.attr('disabled')) {
        cy.wrap($btn).should('be.disabled');
      } else {
        cy.wrap($btn).click({ force: true });
        // The page should remain in edit mode or show validation errors, rather than redirecting/saving successfully
        cy.get(ProfileSelectors.zoneInput).should('exist');
        cy.get(AuthSelectors.toast).should('not.exist');
      }
    });
  });
});

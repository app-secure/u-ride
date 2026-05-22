/// <reference types="cypress" />

export const EMAIL = 'mramirez1561@uta.edu.ec';
export const PASSWORD = 'Manuelr@mirez21';

// Helper a prueba de fallos para Angular e Ionic
export const typeInIonInput = (selector: string, value: string) => {
  cy.get(selector).then($el => {
    if ($el[0].shadowRoot) {
      cy.wrap($el).shadow().find('input').clear({ force: true }).type(value, { force: true });
    } else {
      cy.wrap($el).find('input').clear({ force: true }).type(value, { force: true });
    }
  });
  cy.wait(400);
};

export const clickIonButton = (containsText: string) => {
  cy.wait(500); 
  cy.contains('ion-button, button', containsText).click({ force: true });
  cy.wait(800); 
};

export const selectRoleIfNeeded = (roleLabel: 'Viajar' | 'Conducir') => {
  cy.url().then(url => {
    if (url.includes('/app/role')) {
      cy.contains('button.role-card', roleLabel).click({ force: true });
      cy.wait(2000);
    }
  });
};

export const loginAndNavigateTo = (roleLabel: 'Viajar' | 'Conducir', expectedPath: string) => {
  cy.visit('/auth/login');
  cy.wait(1000);
  typeInIonInput('ion-input[formControlName="email"]', EMAIL);
  typeInIonInput('ion-input[formControlName="password"]', PASSWORD);
  clickIonButton('Entrar');

  selectRoleIfNeeded(roleLabel);

  cy.url({ timeout: 15000 }).should('match', /\/app(\/role|\/trips|\/my-trips|\/admin)/);
  
  // Ir a la pestaña específica si no estamos en ella:
  cy.url().then(url => {
    if (!url.includes(expectedPath)) {
      cy.visit(expectedPath);
      cy.wait(1500);
    }
  });
};

import { ProfileSelectors } from '../../support/selectors';

describe('Perfil - Visualización de Perfil', () => {
  beforeEach(() => {
    cy.loginAsPassenger();
    cy.visit('/app/profile');
    cy.wait(1500);
  });

  it('Debe mostrar la información personal y de reputación', () => {
    // Assert read-only fields are loaded
    cy.contains('Información Personal').should('be.visible');
    cy.contains('Reputación').should('be.visible');
    cy.contains('Mis Vehículos').should('be.visible');
    
    // Check that elements like career, email, average score exist
    cy.get('.user-identity-row').should('be.visible');
    cy.get('.user-titles h3.name-text').should('not.be.empty');
  });
});

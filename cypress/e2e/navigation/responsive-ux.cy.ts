describe('UX - Pruebas de Diseño Responsivo', () => {

  it('Debe renderizar correctamente en viewport móvil', () => {
    cy.viewport(375, 812);

    cy.visit('/auth/login');

    cy.get('body').should('be.visible');
    cy.get('ion-content').should('exist');
  });

  it('Debe renderizar correctamente en viewport tablet', () => {
    cy.viewport(768, 1024);

    cy.visit('/auth/login');

    cy.get('body').should('be.visible');
    cy.get('ion-content').should('exist');
  });

  it('Debe renderizar correctamente en viewport de escritorio', () => {
    cy.viewport(1280, 720);

    cy.visit('/auth/login');

    cy.get('body').should('be.visible');
    cy.get('ion-content').should('exist');
  });

});
describe('Navigation - Pestañas y Vistas', () => {

  it('Debe navegar a diferentes vistas mediante el menú de perfil', () => {

    cy.visit('/app/profile');

    cy.url()
      .should('include', '/app/profile');

    cy.visit('/app/trips');

    cy.url()
      .should('include', '/app/trips');

  });

});
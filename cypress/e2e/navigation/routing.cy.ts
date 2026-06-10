describe('Navigation - Rutas Protegidas y Redirecciones', () => {

  it('Debe permitir acceder a rutas protegidas con sesión activa', () => {

    cy.visit('/app/trips');

    cy.wait(2000);

    cy.url().should('include', '/app/trips');

  });

  it('Debe manejar URLs inválidas sin romper la aplicación', () => {

    cy.visit('/some-invalid-route-slug-123', {
      failOnStatusCode: false
    });

    cy.wait(2000);

    cy.get('body').should('exist');

  });

});
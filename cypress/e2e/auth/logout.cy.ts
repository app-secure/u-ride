describe('Auth - Cerrar Sesión', () => {

  beforeEach(() => {
    cy.loginAsPassenger();
    cy.visit('/app/profile');
  });

  it('Debe cerrar la sesión del usuario y redirigir a login', () => {

    cy.logout();

    cy.url({ timeout: 15000 })
      .should('include', '/auth/login');
  });

});
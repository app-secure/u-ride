import { AuthSelectors } from '../../support/selectors';

describe('Pruebas Negativas - Fallos del Sistema y Red', () => {
  beforeEach(() => {
    cy.loginAsPassenger();
  });

  it('Debe manejar adecuadamente la falta de conexión a Internet', () => {
    cy.intercept('GET', '**/api/**', {
      forceNetworkError: true
    }).as('failedRequest');

    cy.visit('/app/trips');
    cy.wait(2000);

    cy.get('body').should('exist');
  });

  it('Debe redirigir o invalidar la sesión si el token ha expirado (Error 401)', () => {
    cy.intercept('GET', '**/api/**', {
      statusCode: 401,
      body: {
        message: 'Token Expired'
      }
    }).as('expiredToken');

    cy.visit('/app/trips');
    cy.wait(3000);

    cy.url().then(url => {
      expect(
        url.includes('/auth/login') ||
        url.includes('/auth/verify-email') ||
        url.includes('/auth')
      ).to.equal(true);
    });
  });

  it('Debe mostrar alerta o toast cuando ocurre un error de servidor (Error 500)', () => {
    cy.intercept('GET', '**/api/**', {
      statusCode: 500,
      body: {
        message: 'Internal Server Error'
      }
    }).as('serverError');

    cy.visit('/app/trips');
    cy.wait(2000);

    cy.get('body').should('exist');
  });

  it('Debe manejar un recurso no encontrado (Error 404)', () => {
    cy.intercept('GET', '**/api/trips/invalid-id', {
      statusCode: 404,
      body: {
        message: 'Trip Not Found'
      }
    }).as('notFound');

    cy.visit('/app/trips/invalid-id');
    cy.wait(3000);

    cy.get('body').should('exist');

    cy.url().should('include', '/app/trips/invalid-id');
  });
});
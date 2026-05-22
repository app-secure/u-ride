import { loginAndNavigateTo } from './trips-helper';

describe('Viajes - Gestionar Reserva (Aceptar/Rechazar)', () => {

  beforeEach(() => {
    loginAndNavigateTo('Conducir', '/app/my-trips');
  });

  it('Debe aceptar o rechazar solicitudes pendientes', () => {
    cy.wait(2000);

    // Entrar al primer viaje que tenga solicitudes (se intenta con el primero de la lista)
    cy.get('body').then($body => {
      if ($body.find('.trip-card').length > 0) {
        cy.get('.trip-card').first().contains('ion-button', 'Detalle de mi viaje').click({ force: true });
        cy.wait(2000);

        cy.get('body').then($b => {
          // Validar si hay lista de solicitudes pendientes
          if ($b.find('ion-item .passenger-info').length > 0) {
            // Intentamos buscar un botón de aceptar
            if ($b.find('ion-button[color="success"]').length > 0) {
              cy.get('ion-button[color="success"]').first().click({ force: true });
              cy.get('ion-toast', { timeout: 10000 }).should('exist');
              cy.wait(1500);
            } else if ($b.find('ion-button[color="danger"]').length > 0) {
              cy.get('ion-button[color="danger"]').first().click({ force: true });
              cy.get('ion-toast', { timeout: 10000 }).should('exist');
            }
          } else {
            cy.log('No hay solicitudes pendientes en este viaje.');
          }
        });
      } else {
        cy.log('No tienes viajes publicados para gestionar reservas.');
      }
    });
  });
});

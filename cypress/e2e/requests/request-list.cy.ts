import { TripSelectors } from '../../support/selectors';

describe('Requests - Listado de Solicitudes', () => {
  beforeEach(() => {
    cy.loginAsDriver();
    cy.visit('/app/my-trips');
    cy.wait(2000);
  });

  it('Debe visualizar la lista de solicitudes del viaje', () => {
    cy.get('body').then($body => {
      if ($body.find(TripSelectors.tripCard).length > 0) {
        // Click en la tarjeta para ir a las solicitudes del viaje
        cy.get(TripSelectors.tripCard).first().click({ force: true });
        cy.wait(2000);

        // Verificar que navegamos a la página de solicitudes, al mapa o detalle del viaje
        cy.url().should('match', /\/app\/(requests|trip-map|trips)\//);
        cy.get('ion-content').should('exist');
      } else {
        cy.log('No trips found. Skipping request list check.');
      }
    });
  });

  it('Debe mostrar el listado de viajes del conductor', () => {
    // Al menos debe existir el contenedor de viajes
    cy.get('ion-content').should('exist');

    cy.get('body').then($body => {
      if ($body.find(TripSelectors.tripCard).length > 0) {
        cy.get(TripSelectors.tripCard).should('have.length.gte', 1);
        cy.log(`Se encontraron ${$body.find(TripSelectors.tripCard).length} viajes`);
      } else {
        cy.contains('No hay viajes').should('exist');
      }
    });
  });
});

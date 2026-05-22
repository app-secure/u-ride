import { loginAndNavigateTo, clickIonButton, typeInIonInput } from './trips-helper';

describe('Viajes - Crear Viaje', () => {

  beforeEach(() => {
    loginAndNavigateTo('Conducir', '/app/publish');
  });

  it('Debe publicar un nuevo viaje correctamente', () => {
    cy.wait(2000);

    cy.get('body').then($body => {
      // 1. Verificar si necesitamos registrar un vehículo primero
      if ($body.find('.no-vehicle-state').length > 0) {
        cy.log('No hay vehículos, registrando uno...');
        cy.contains('Ir a Mis Vehículos').click({ force: true });
        cy.wait(1500);
        
        // Estamos en la pantalla de vehículos, agregamos uno
        cy.contains('ion-button', 'Agregar').click({ force: true });
        cy.wait(1000);

        cy.get('input[formControlName="brand"]').type('Toyota', { force: true });
        cy.get('input[formControlName="modelOrBusNumber"]').type('Corolla', { force: true });
        cy.get('input[formControlName="plate"]').type('ABC-1234', { force: true });
        cy.get('input[formControlName="color"]').type('Rojo', { force: true });
        cy.get('input[formControlName="seats"]').clear({ force: true }).type('4', { force: true });

        cy.contains('ion-button', 'Agregar vehículo').click({ force: true });
        cy.wait(2000); // Esperar a que guarde

        // Volver a publicar viaje
        cy.visit('/app/publish');
        cy.wait(2000);
      }

      // 2. Seleccionar ruta (ion-select) abriendo el popover y haciendo clic en el radio button
      cy.get('ion-select[formControlName="routeName"]').click();
      cy.wait(1000);
      // El popover crea elementos ion-radio. El index 0 es el placeholder "Seleccionar ruta", así que tomamos el 1.
      cy.get('ion-radio').eq(1).click({ force: true });
      cy.wait(500);

      // 3. Seleccionar Origen
      cy.get('button.location-select-btn').first().click();
      cy.wait(1000);
      cy.get('ion-searchbar').type('Parque Cevallos');
      cy.wait(2500);
      cy.contains('ion-button', 'Confirmar').click({ force: true });
      cy.wait(500);

      // 4. Seleccionar Destino
      cy.get('button.location-select-btn').last().click();
      cy.wait(1000);
      cy.get('ion-searchbar').type('Universidad Técnica de Ambato');
      cy.wait(2500);
      cy.contains('ion-button', 'Confirmar').click({ force: true });
      cy.wait(500);

      // 5. Fecha y hora
      const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
      cy.get('input[formControlName="date"]').type(tomorrow, { force: true });
      cy.get('input[formControlName="time"]').type('10:00', { force: true });

      // 6. Seleccionar Vehículo
      cy.contains('label', 'Selecciona un vehículo').parent().find('ion-select').click({ force: true });
      cy.wait(1000);
      // Tomar la primera opción válida de vehículo
      cy.get('ion-radio').last().click({ force: true });
      cy.wait(500);

      // 7. Cupos disponibles
      cy.get('input[formControlName="seatsTotal"]').clear({ force: true }).type('3', { force: true });

      // 8. Costo sugerido
      cy.get('input[formControlName="price"]').clear({ force: true }).type('1.50', { force: true });

      // 9. Método de pago
      cy.get('ion-select[formControlName="paymentMethod"]').click();
      cy.wait(1000);
      // Hacer click en la opción de Efectivo dentro del popover
      cy.contains('ion-radio', 'Efectivo').click({ force: true });
      cy.wait(500);

      // 10. Reglas del viaje
      cy.get('ion-checkbox').first().click({ force: true });

      // Enviar formulario
      clickIonButton('Publicar Viaje');

      // Verificar redirección y mensaje de éxito
      cy.get('ion-toast', { timeout: 10000 }).should('exist');
      cy.url().should('include', '/app/my-trips');
    });
  });
});

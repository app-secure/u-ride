import { selectRoleIfNeeded, loginDirectly, typeInIonInput } from './auth-helper';
import { AuthSelectors, ProfileSelectors, VehicleSelectors, TripSelectors } from './selectors';
import { TestData } from './test-data';
export const clickIonButton = (containsText: string) => {
  cy.wait(400);
  cy.contains('ion-button, button', containsText).click({ force: true });
  cy.wait(600);
};

export const loginAndNavigateTo = (roleLabel: 'Viajar' | 'Conducir', expectedPath: string) => {
  loginDirectly(
    roleLabel === 'Conducir' ? TestData.driver.email : TestData.passenger.email,
    roleLabel === 'Conducir' ? TestData.driver.password : TestData.passenger.password
  );

  selectRoleIfNeeded(roleLabel);

  cy.url({ timeout: 15000 }).should('match', /\/app(\/role|\/trips|\/my-trips|\/admin)/);

  cy.url().then(url => {
    if (!url.includes(expectedPath)) {
      cy.visit(expectedPath);
      cy.wait(1500);
    }
  });
};

export const ensureVehicleRegistered = () => {
  cy.get('body').then($body => {
    if ($body.find(ProfileSelectors.noVehicleState).length > 0) {
      cy.log('No vehicles registered. Registering one first...');
      cy.contains('Ir a Mis Vehículos').click({ force: true });
      cy.wait(1500);

      cy.get(VehicleSelectors.addBtnText).click({ force: true });
      cy.wait(1000);

      cy.get(VehicleSelectors.brandInput).type(TestData.vehicle.brand, { force: true });
      cy.get(VehicleSelectors.modelInput).type(TestData.vehicle.model, { force: true });
      cy.get(VehicleSelectors.plateInput).type(TestData.vehicle.plate, { force: true });
      cy.get(VehicleSelectors.colorInput).type(TestData.vehicle.color, { force: true });
      cy.get(VehicleSelectors.seatsInput).clear({ force: true }).type(TestData.vehicle.seats, { force: true });

      cy.get(VehicleSelectors.submitAddBtnText).click({ force: true });
      cy.wait(2000); // Wait for save operation

      // Go back to publishing trip
      cy.visit('/app/publish');
      cy.wait(2000);
    }
  });
};
export { selectRoleIfNeeded };
export { loginDirectly };
export { typeInIonInput };
export { TestData };

/// <reference types="cypress" />

import { loginDirectly, selectRoleIfNeeded } from './auth-helper';
import { TestData } from './test-data';
import { AuthSelectors, TripSelectors } from './selectors';
import { clickIonButton, ensureVehicleRegistered } from './trips-helper';

/* ─────────────────────────────────────────────────────────────
   LOGIN COMMANDS
───────────────────────────────────────────────────────────── */

Cypress.Commands.add('loginAsPassenger', () => {
  loginDirectly(TestData.passenger.email, TestData.passenger.password);
  selectRoleIfNeeded('Viajar');
});

Cypress.Commands.add('loginAsDriver', () => {
  loginDirectly(TestData.driver.email, TestData.driver.password);
  selectRoleIfNeeded('Conducir');
});

Cypress.Commands.add('loginAsAdmin', () => {
  loginDirectly(TestData.admin.email, TestData.admin.password);
  // Admin role selection might not be required or might be different, but let's assume it has no role selection or it selects automatically based on user type. We will just login directly. If it requires role selection, we might need to add it later.
});

/* ─────────────────────────────────────────────────────────────
   LOGOUT
───────────────────────────────────────────────────────────── */

Cypress.Commands.add('logout', () => {
  cy.get('body').then($body => {
    if ($body.find('[data-cy=logout], ion-button.logout-btn').length) {
      cy.get('[data-cy=logout], ion-button.logout-btn').first().click({ force: true });
    } else if ($body.text().includes('Cerrar sesión')) {
      cy.contains('Cerrar sesión').click({ force: true });
    } else {
      cy.visit('/auth/login');
    }
  });

  cy.location('pathname', { timeout: 20000 }).should('include', '/auth/login');
});

/* ─────────────────────────────────────────────────────────────
   CREATE TRIP (full form flow)
───────────────────────────────────────────────────────────── */

Cypress.Commands.add('createTrip', () => {
  cy.visit('/app/publish');
  cy.wait(2000);
  ensureVehicleRegistered();

  // Ruta
  cy.get(TripSelectors.routeSelect, { timeout: 10000 }).click();
  cy.wait(800);
  cy.get('ion-radio').eq(TestData.trip.routeIndex).click({ force: true });
  cy.wait(400);

  // Origen
  cy.get(TripSelectors.locationSelectBtns).first().click();
  cy.wait(800);
  cy.get(TripSelectors.searchbar).type(TestData.trip.originQuery);
  cy.wait(2500);
  clickIonButton('Confirmar');
  cy.wait(400);

  // Destino
  cy.get(TripSelectors.locationSelectBtns).last().click();
  cy.wait(800);
  cy.get(TripSelectors.searchbar).type(TestData.trip.destinationQuery);
  cy.wait(2500);
  clickIonButton('Confirmar');
  cy.wait(400);

  // Fecha y hora (aleatoria para evitar 409 Conflict de solapamiento en BD sucia)
  const randomDays = Math.floor(Math.random() * 28) + 2; // Entre 2 y 30 días en el futuro
  const futureDate = new Date(Date.now() + randomDays * 86400000).toISOString().split('T')[0];
  
  const randomHour = Math.floor(Math.random() * 14) + 6; // Entre 06 y 19
  const randomMinute = Math.floor(Math.random() * 60);
  const timeStr = `${randomHour.toString().padStart(2, '0')}:${randomMinute.toString().padStart(2, '0')}`;

  cy.get(TripSelectors.dateInput).type(futureDate, { force: true });
  cy.get(TripSelectors.timeInput).type(timeStr, { force: true });

  // Vehículo
  cy.contains('label', 'Selecciona un vehículo').parent().find('ion-select').click({ force: true });
  cy.wait(800);
  cy.get('ion-radio').last().click({ force: true });
  cy.wait(400);

  // Cupos y precio
  cy.get(TripSelectors.seatsInput).clear({ force: true }).type(TestData.trip.seats, { force: true });
  cy.get(TripSelectors.priceInput).clear({ force: true }).type(TestData.trip.price, { force: true });

  // Método de pago
  cy.get(TripSelectors.paymentMethodSelect).click();
  cy.wait(800);
  cy.contains('ion-radio', 'Efectivo').click({ force: true });
  cy.wait(400);

  // Reglas
  cy.get(TripSelectors.rulesCheckbox).first().click({ force: true });

  // Enviar
  clickIonButton('Publicar Viaje');

  cy.get(AuthSelectors.toast, { timeout: 15000 }).should('exist');
  cy.url().should('include', '/app/my-trips');
});

/* ─────────────────────────────────────────────────────────────
   RESERVE TRIP
───────────────────────────────────────────────────────────── */

Cypress.Commands.add('reserveTrip', () => {
  cy.visit('/app/trips');
  cy.wait(2000);

  cy.get('body').then($body => {
    const card = $body.find('.trips-grid .trip-card');
    if (!card.length) {
      cy.log('No hay viajes disponibles para reservar');
      return;
    }

    cy.wrap(card.first()).click({ force: true });
    cy.wait(1500);

    cy.contains('ion-button, button', /Reservar|Solicitar/i, { timeout: 10000 })
      .click({ force: true });

    // Aceptar las reglas mínimas de seguridad
    cy.get('.alert-confirm-btn', { timeout: 10000 }).click({ force: true });

    cy.get(AuthSelectors.toast, { timeout: 10000 }).should('exist');
  });
});

/* ─────────────────────────────────────────────────────────────
   TYPE DECLARATIONS
───────────────────────────────────────────────────────────── */

declare global {
  namespace Cypress {
    interface Chainable {
      loginAsPassenger(): Chainable<void>;
      loginAsDriver(): Chainable<void>;
      loginAsAdmin(): Chainable<void>;
      logout(): Chainable<void>;
      createTrip(): Chainable<void>;
      reserveTrip(): Chainable<void>;
    }
  }
}

export {};
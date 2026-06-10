import { AuthSelectors, TripSelectors } from '../support/selectors';
import { clickIonButton, ensureVehicleRegistered } from '../support/trips-helper';
import { TestData } from '../support/test-data';

// ─────────────────────────────────────────────────────────────────────────────
// Sistema E2E - Flujo Completo del Sistema
// Escenario de prueba secuencial involucrando Conductor, Pasajero y Admin.
// ─────────────────────────────────────────────────────────────────────────────

describe('Sistema E2E - Flujo de Integración Completo (Conductor, Pasajero, Admin)', () => {

  before(() => {
    // Estado limpio inicial antes de toda la suite
    cy.clearAllCookies();
    cy.clearAllLocalStorage();
    cy.clearAllSessionStorage();

    // 1. Obtener token del Administrador por Firebase Auth REST API
    cy.request({
      method: 'POST',
      url: 'https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=AIzaSyB8eELUMGPKrccEIgIipGw23ijL9kgnmx4',
      body: {
        email: TestData.admin.email,
        password: TestData.admin.password,
        returnSecureToken: true
      }
    }).then((adminLoginRes) => {
      const adminToken = adminLoginRes.body.idToken;

      // 2. Obtener lista de usuarios para des-suspender al conductor y pasajero
      cy.request({
        method: 'GET',
        url: 'http://localhost:5132/api/users?page=1&pageSize=50',
        headers: { Authorization: `Bearer ${adminToken}` }
      }).then((usersRes) => {
        const users = usersRes.body.items;
        
        const driverUser = users.find((u: any) => u.email === TestData.driver.email);
        if (driverUser) {
          cy.request({
            method: 'POST',
            url: `http://localhost:5132/api/users/${driverUser.firebaseUid}/unsuspend`,
            headers: { Authorization: `Bearer ${adminToken}` },
            failOnStatusCode: false
          });
        }

        const passengerUser = users.find((u: any) => u.email === TestData.passenger.email);
        if (passengerUser) {
          cy.request({
            method: 'POST',
            url: `http://localhost:5132/api/users/${passengerUser.firebaseUid}/unsuspend`,
            headers: { Authorization: `Bearer ${adminToken}` },
            failOnStatusCode: false
          });
        }
      });
    });

    // 3. Obtener token del Conductor para limpiar sus viajes activos previos
    cy.request({
      method: 'POST',
      url: 'https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=AIzaSyB8eELUMGPKrccEIgIipGw23ijL9kgnmx4',
      body: {
        email: TestData.driver.email,
        password: TestData.driver.password,
        returnSecureToken: true
      }
    }).then((driverLoginRes) => {
      const driverToken = driverLoginRes.body.idToken;

      cy.request({
        method: 'GET',
        url: 'http://localhost:5132/api/trips/my-trips',
        headers: { Authorization: `Bearer ${driverToken}` }
      }).then((tripsRes) => {
        const trips = tripsRes.body;
        if (Array.isArray(trips)) {
          trips.forEach((t: any) => {
            if (['open', 'closed', 'inprogress'].includes(t.status)) {
              cy.request({
                method: 'PATCH',
                url: `http://localhost:5132/api/trips/${t.id}/status`,
                body: { status: 'cancelled' },
                headers: { Authorization: `Bearer ${driverToken}` },
                failOnStatusCode: false
              });
            }
          });
        }
      });
    });
  });

  beforeEach(() => {
    // Limpieza adicional entre pruebas por seguridad
  });

  it('FLOW-01: Conductor - Login, Agregar Vehículo y Publicar Viaje', () => {
    cy.clearAllCookies();
    cy.clearAllLocalStorage();
    cy.clearAllSessionStorage();

    cy.loginAsDriver();
    cy.createTrip();

    cy.visit('/app/my-trips');
    cy.contains('button.nav-item', 'Viajes Activos').click();
    cy.get('.trip-card', { timeout: 10000 }).should('exist');

    cy.logout();
  });

  it('FLOW-02: Pasajero - Login, Buscar Viaje y Enviar Solicitud', () => {
    cy.clearAllCookies();
    cy.clearAllLocalStorage();
    cy.clearAllSessionStorage();

    cy.loginAsPassenger();

    // Utiliza el comando reserveTrip (ya corregido para aceptar alertas)
    cy.reserveTrip();

    // Verificar en "Mis Viajes" que la solicitud está pendiente
    cy.visit('/app/trips');
    cy.contains('button.nav-item', 'Mis Viajes').click({ force: true });
    cy.get('.trip-card.recent-card', { timeout: 10000 }).should('exist');
    cy.contains(/Pendiente/i).should('exist');

    cy.logout();
  });

  it('FLOW-03: Conductor - Aceptar Solicitud de Pasajero', () => {
    cy.clearAllCookies();
    cy.clearAllLocalStorage();
    cy.clearAllSessionStorage();

    cy.loginAsDriver();

    cy.visit('/app/my-trips');
    cy.contains('button.nav-item', 'Viajes Activos').click();

    // Entrar al detalle del viaje
    cy.get('.trip-card').first().click({ force: true });

    // Ir a la lista de solicitudes
    cy.get('.btn-requests-main', { timeout: 10000 }).click({ force: true });

    // Aceptar la solicitud del pasajero
    cy.contains('ion-button, button', /Aceptar/i, { timeout: 10000 }).first().click({ force: true });

    // Toast confirmando aceptación
    cy.get(AuthSelectors.toast, { timeout: 10000 }).should('exist');

    cy.logout();
  });

  it('FLOW-04: Pasajero - Realizar Pago', () => {
    cy.clearAllCookies();
    cy.clearAllLocalStorage();
    cy.clearAllSessionStorage();

    cy.loginAsPassenger();
    cy.visit('/app/trips');
    cy.contains('button.nav-item', 'Mis Viajes').click({ force: true });

    // Proceder al pago (botón en la tarjeta de Mis Viajes)
    cy.contains('button', /Pagar ahora/i, { timeout: 10000 }).click({ force: true });

    // Seleccionar opción de pago en el modal
    cy.get('.payment-method-btn').last().click({ force: true });

    cy.get(AuthSelectors.toast, { timeout: 10000 }).should('exist');

    cy.logout();
  });

  it('FLOW-05: Conductor - Iniciar y Finalizar Viaje', () => {
    cy.clearAllCookies();
    cy.clearAllLocalStorage();
    cy.clearAllSessionStorage();

    cy.loginAsDriver();
    cy.visit('/app/my-trips');

    // Iniciar el viaje desde mis viajes
    cy.get('button.action-btn').contains(/Iniciar Viaje/i).first().click({ force: true });

    // Confirmar inicio (alerta)
    cy.get('body').then($body => {
      if ($body.find('ion-alert').length > 0) {
        cy.get('ion-alert button').contains(/Sí|Confirmar|Iniciar/i).click({ force: true });
      }
    });

    cy.get(AuthSelectors.toast, { timeout: 10000 }).should('exist');

    // Finalizar el viaje
    cy.get('button.action-btn').contains(/Finalizar Viaje/i, { timeout: 15000 }).click({ force: true });
    cy.get('body').then($body => {
      if ($body.find('ion-alert').length > 0) {
        cy.get('ion-alert button').contains(/Sí/i).click({ force: true });
      }
    });

    cy.get(AuthSelectors.toast, { timeout: 10000 }).should('exist');

    cy.logout();
  });

  it('FLOW-06: Calificación y Reporte (Pasajero y Conductor)', () => {
    // 6.a Pasajero reporta al conductor
    cy.clearAllCookies();
    cy.clearAllLocalStorage();
    cy.clearAllSessionStorage();

    cy.loginAsPassenger();
    cy.visit('/app/trips');
    cy.contains('button.nav-item', 'Mis Viajes').click({ force: true });

    // Cambiar a historial
    cy.get('.filter-chip').click({ force: true });

    // Historial / viajes completados del pasajero
    cy.get('.trip-card.recent-card').first().click({ force: true });

    // Bandera roja de reporte
    cy.get('.btn-report-icon', { timeout: 10000 }).first().click({ force: true });

    cy.get('ion-textarea, textarea').first().type('Conductor condujo peligrosamente.');
    cy.get('ion-button, button').contains(/Enviar Reporte|Reportar/i).click({ force: true });
    cy.get(AuthSelectors.toast, { timeout: 15000 }).should('exist');

    cy.logout();

    // 6.b Conductor califica al pasajero
    cy.clearAllCookies();
    cy.clearAllLocalStorage();
    cy.clearAllSessionStorage();

    cy.loginAsDriver();
    cy.visit('/app/my-trips');

    // Ir a Historial
    cy.contains('button.nav-item', 'Historial').click();

    // Ver lista de pasajeros
    cy.get('button.action-btn').contains(/Ver Lista de Pasajeros/i).first().click({ force: true });

    // Calificar
    cy.get('ion-button, button').contains(/Calificar/i).first().click({ force: true });

    // Calificación de estrellas (ejemplo: 5 estrellas)
    cy.get('ion-icon[name="star"]').last().click({ force: true });
    cy.get('ion-textarea, textarea').first().type('Buen pasajero');
    cy.get('ion-button, button').contains(/Enviar Calificación/i).click({ force: true });
    cy.get(AuthSelectors.toast, { timeout: 10000 }).should('exist');

    cy.logout();
  });

  it('FLOW-07: Admin - Gestión de Reportes y Suspensión', () => {
    cy.clearAllCookies();
    cy.clearAllLocalStorage();
    cy.clearAllSessionStorage();

    cy.loginAsAdmin();
    cy.visit('/app/admin/reports');

    // Suspender al reportado 7 días
    cy.get('.suspend-btn', { timeout: 15000 }).first().click({ force: true });
    cy.get(AuthSelectors.toast, { timeout: 10000 }).should('exist');
    cy.logout();
  });

  it('FLOW-08: Conductor - Apelación de Suspensión', () => {
    cy.clearAllCookies();
    cy.clearAllLocalStorage();
    cy.clearAllSessionStorage();

    cy.loginAsDriver();
    cy.visit('/app/my-trips');

    // Debe mostrar banner de suspensión
    cy.get('.suspension-banner', { timeout: 15000 }).should('exist');
    cy.get('.appeal-btn').click({ force: true });

    // Llenar alerta de apelación (Ionic Alert Prompt)
    cy.get('ion-alert input.alert-input, ion-alert textarea').first().type('Por favor revisen mi caso, fue un malentendido.', { force: true });
    cy.get('ion-alert button').contains(/Enviar Apelación|Enviar/i).click({ force: true });
    cy.get(AuthSelectors.toast, { timeout: 10000 }).should('exist');

    cy.logout();
  });

  it('FLOW-09: Admin - Aprobación de Apelación y Revisión de Usuarios', () => {
    cy.clearAllCookies();
    cy.clearAllLocalStorage();
    cy.clearAllSessionStorage();

    cy.loginAsAdmin();

    // Revisar y aprobar la apelación
    cy.visit('/app/admin/appeals');
    cy.get('.quick-btn.success', { timeout: 15000 }).first().click({ force: true });
    cy.get(AuthSelectors.toast, { timeout: 10000 }).should('exist');

    // Ver usuarios
    cy.visit('/app/admin/users');
    cy.get('.user-main', { timeout: 15000 }).first().click({ force: true });
    cy.get('.detail-modal', { timeout: 10000 }).should('exist');
    cy.get('.close-btn').first().click({ force: true });

    cy.logout();
  });

});

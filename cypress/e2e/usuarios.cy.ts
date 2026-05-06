/// <reference types="cypress" />

// Helper a prueba de fallos para Angular e Ionic
const typeInIonInput = (selector: string, value: string) => {
  cy.get(selector).then($el => {
    if ($el[0].shadowRoot) {
      cy.wrap($el).shadow().find('input').clear({ force: true }).type(value, { force: true });
    } else {
      cy.wrap($el).find('input').clear({ force: true }).type(value, { force: true });
    }
  });
  // Pausa de medio segundo al escribir para que se vea en la presentación
  cy.wait(400);
};

// Helper dinámico para botones
const clickIonButton = (containsText: string) => {
  cy.wait(500); // Pausa antes de dar clic
  cy.contains('ion-button, button', containsText).click({ force: true });
  cy.wait(800); // Pausa después de dar clic
};

const selectRoleIfNeeded = (roleLabel: 'Viajar' | 'Conducir', targetPath: string) => {
  cy.url().then(url => {
    if (url.includes('/app/role')) {
      cy.contains('button.role-card', roleLabel).click({ force: true });
      cy.url({ timeout: 15000 }).should('include', targetPath);
      cy.wait(1000);
    }
  });
};

describe('Módulo de Usuarios - U-Ride (E2E)', () => {

  const EMAIL = 'sjimenez6271@uta.edu.ec';
  const PASSWORD = 'crysjurado21';

  // ─────────────────────────────────────────────
  // RF1 - Iniciar Sesión
  // ─────────────────────────────────────────────

  describe('RF1 - Iniciar Sesión', () => {

    beforeEach(() => {
      cy.visit('/auth/login');
      cy.wait(1000); // Esperar que cargue la pantalla
    });

    it('CP-RF001-01: Debe iniciar sesión con credenciales institucionales válidas', () => {
      typeInIonInput('ion-input[formControlName="email"]', EMAIL);
      typeInIonInput('ion-input[formControlName="password"]', PASSWORD);

      clickIonButton('Entrar');

      selectRoleIfNeeded('Viajar', '/app/trips');

      cy.url({ timeout: 15000 }).should('match', /\/app(\/role|\/trips|\/my-trips|\/admin)/);
      cy.wait(2000); // Pausa al final para apreciar el resultado
    });

    it('CP-RF001-02: Debe mostrar error con contraseña incorrecta', () => {
      typeInIonInput('ion-input[formControlName="email"]', EMAIL);
      typeInIonInput('ion-input[formControlName="password"]', 'contraseña_INCORRECTA_999');

      clickIonButton('Entrar');

      cy.get('ion-toast', { timeout: 8000 }).should('exist');
      cy.wait(2000); // Tiempo para leer el toast
    });

  });

  // ─────────────────────────────────────────────
  // RF1 - Registrarse
  // ─────────────────────────────────────────────

  describe('RF1 - Registrarse', () => {

    beforeEach(() => {
      cy.visit('/auth/register');
      cy.wait(1000);
    });

    it('CP-RF001-03: Debe rechazar registro con correo @gmail.com (dominio no permitido)', () => {
      typeInIonInput('ion-input[formControlName="firstName"]', 'Test');
      typeInIonInput('ion-input[formControlName="lastName"]', 'Usuario');
      typeInIonInput('ion-input[formControlName="email"]', 'testuser@gmail.com');
      typeInIonInput('ion-input[formControlName="password"]', 'Password123!');
      typeInIonInput('ion-input[formControlName="password2"]', 'Password123!');
      typeInIonInput('ion-input[formControlName="career"]', 'Software');
      typeInIonInput('ion-input[formControlName="phone"]', '0999999999');
      typeInIonInput('ion-input[formControlName="zone"]', 'Centro');

      cy.get('ion-checkbox.terms-checkbox').click({ force: true });

      clickIonButton('Crear cuenta');

      cy.get('ion-toast', { timeout: 8000 }).should('exist');
      cy.wait(2000);
    });

    it('CP-RF001-04: Debe aceptar registro con correo @uta.edu.ec', () => {
      const uniqueEmail = `testcypress.${Date.now()}@uta.edu.ec`;
      typeInIonInput('ion-input[formControlName="firstName"]', 'Cypress');
      typeInIonInput('ion-input[formControlName="lastName"]', 'Test');
      typeInIonInput('ion-input[formControlName="email"]', uniqueEmail);
      typeInIonInput('ion-input[formControlName="password"]', 'Password123!');
      typeInIonInput('ion-input[formControlName="password2"]', 'Password123!');
      typeInIonInput('ion-input[formControlName="career"]', 'Software');
      typeInIonInput('ion-input[formControlName="phone"]', '0999999999');
      typeInIonInput('ion-input[formControlName="zone"]', 'Ficoa');

      cy.get('ion-checkbox.terms-checkbox').click({ force: true });

      clickIonButton('Crear cuenta');

      cy.url({ timeout: 15000 }).should('match', /verify-email|app/);
      cy.wait(2000);
    });

  });

  // ─────────────────────────────────────────────
  // RF1 - Recuperar contraseña
  // ─────────────────────────────────────────────

  describe('RF1 - Recuperar contraseña', () => {

    it('CP-RF001-05: Debe enviar correo de recuperación con email institucional válido', () => {
      cy.visit('/auth/forgot-password');
      cy.wait(1000);

      typeInIonInput('ion-input[formControlName="email"]', EMAIL);

      clickIonButton('Enviar');

      cy.get('ion-toast', { timeout: 8000 }).should('exist');
      cy.wait(2000);
    });

  });

  // ─────────────────────────────────────────────
  // RF2 - Editar Perfil
  // ─────────────────────────────────────────────

  describe('RF2 - Editar Perfil de Usuario', () => {

    beforeEach(() => {
      cy.visit('/auth/login');
      cy.wait(1000);
      typeInIonInput('ion-input[formControlName="email"]', EMAIL);
      typeInIonInput('ion-input[formControlName="password"]', PASSWORD);
      clickIonButton('Entrar');

      selectRoleIfNeeded('Viajar', '/app/trips');

      cy.url({ timeout: 15000 }).should('match', /\/app(\/role|\/trips|\/my-trips|\/admin)/);
      cy.wait(1000);
    });

    it('CP-RF002-01: Debe actualizar la zona de referencia del perfil', () => {
      cy.visit('/app/profile');
      cy.wait(1000);

      clickIonButton('Editar');
      typeInIonInput('ion-input[formControlName="zone"]', 'Huachi Grande');
      clickIonButton('Guardar');

      cy.get('ion-toast', { timeout: 8000 }).should('exist');
      cy.wait(2000);
    });

    it('CP-RF002-02: No debe guardar si la zona está vacía (campo requerido)', () => {
      cy.visit('/app/profile');
      cy.wait(1000);

      clickIonButton('Editar');

      cy.get('ion-input[formControlName="zone"]').then($el => {
        if ($el[0].shadowRoot) {
          cy.wrap($el).shadow().find('input').clear({ force: true });
        } else {
          cy.wrap($el).find('input').clear({ force: true });
        }
      });
      cy.wait(1000); // Pausa visual para ver que se vació el campo

      clickIonButton('Guardar');

      cy.get('ion-input[formControlName="zone"]').should('exist');
      cy.url().should('include', '/app/profile');
      cy.wait(2000);
    });

  });

});

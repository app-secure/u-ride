import { AuthSelectors, ReportSelectors } from '../../support/selectors';

// ─────────────────────────────────────────────────────────────────────────────
// Reportes - Crear Reporte (Pasajero reporta a otro usuario)
// URL: /app/report/<userId>
// ─────────────────────────────────────────────────────────────────────────────

describe('Reportes - Crear Reporte', () => {

  const reportedUserId = 'vCGrTtCnwwgIXb0PEm8VPY5PbjS2';

  beforeEach(() => {
    cy.loginAsPassenger();
    
    // Interceptar la petición de creación de reporte para no depender del backend
    cy.intercept('POST', '**/api/reports', {
      statusCode: 201,
      body: {
        id: 999,
        reportedUid: reportedUserId,
        reporterUid: 'PqNxoaGLuLNM0bdFLsmKac6UiHx1',
        reason: 'Reporte de prueba',
        status: 'pending',
        createdAt: new Date().toISOString()
      }
    }).as('createReport');

    cy.visit(`/app/report/${reportedUserId}`);
    cy.get('ion-content', { timeout: 15000 }).should('exist');
  });

  it('REP-01: El formulario de reporte debe renderizarse', () => {
    cy.get(ReportSelectors.reasonTextarea, { timeout: 15000 })
      .should('exist');
    cy.get(ReportSelectors.submitBtn).should('exist');
  });

  it('REP-02: Debe mostrar validación cuando el motivo es demasiado corto', () => {
    cy.get(ReportSelectors.reasonTextarea, { timeout: 15000 })
      .should('be.visible')
      .clear({ force: true })
      .type('abc', { force: true })
      .blur();

    cy.wait(500);

    // El HTML muestra: "La descripción es requerida (mín. 5 caracteres, máx. 700)."
    cy.get('.error-msg', { timeout: 5000 })
      .should('be.visible')
      .and('contain.text', 'La descripción es requerida');

    // Intentar enviar no debe navegar
    cy.get(ReportSelectors.submitBtn).click({ force: true });
    cy.url().should('include', `/app/report/${reportedUserId}`);
  });

  it('REP-03: Debe permitir escribir un motivo válido', () => {
    cy.get(ReportSelectors.reasonTextarea, { timeout: 15000 })
      .should('be.visible')
      .type('El usuario usó lenguaje ofensivo y no respetó las normas de convivencia.', { force: true });

    // El botón de envío no debe estar deshabilitado (el form es válido)
    cy.get(ReportSelectors.submitBtn)
      .should('not.have.attr', 'disabled');
  });

  it('REP-04: Debe mostrar los botones de evidencia (cámara y galería)', () => {
    cy.get(ReportSelectors.evidenceBtn, { timeout: 10000 })
      .should('have.length.gte', 1);

    cy.contains('button', /Cámara|Camera/i).should('exist');
    cy.contains('button', /Galería|Gallery/i).should('exist');
  });

  it('REP-05: Debe crear un reporte con descripción válida y mostrar toast de confirmación', () => {
    cy.get(ReportSelectors.reasonTextarea, { timeout: 15000 })
      .should('be.visible')
      .type('El usuario usó lenguaje ofensivo durante el trayecto y no respetó las reglas.', { force: true });

    cy.get(ReportSelectors.submitBtn).should('not.have.attr', 'disabled');
    cy.get(ReportSelectors.submitBtn).click({ force: true });

    // Verificar que se haya hecho la llamada
    cy.wait('@createReport').its('request.body').should('deep.include', {
      reportedUid: reportedUserId
    });

    // Esperar toast de confirmación
    cy.get(AuthSelectors.toast, { timeout: 15000 })
      .should('exist');
  });

});
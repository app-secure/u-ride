// ─────────────────────────────────────────────────────────────────────────────
// Support file — se carga automáticamente antes de cada spec de Cypress.
// ─────────────────────────────────────────────────────────────────────────────

import './commands';

// Limpiar sessionStorage antes de cada test para evitar contaminación de estado
beforeEach(() => {
  cy.window().then(win => {
    win.sessionStorage.clear();
  });
});

// Ignorar errores no controlados de la app (CORS, Firebase, Ionic routing)
// para que los tests E2E no fallen por errores del framework.
Cypress.on('uncaught:exception', (err) => {
  // Ignorar errores conocidos del framework que no afectan la funcionalidad
  const ignoredMessages = [
    'ResizeObserver loop',
    'getActivatableTarget',
    'Cannot read properties of null',
    'chunk',
    'Firebase',
    'zone.js',
  ];

  const shouldIgnore = ignoredMessages.some(msg =>
    err.message.toLowerCase().includes(msg.toLowerCase())
  );

  return !shouldIgnore; // false = ignorar, true = fallar el test
});
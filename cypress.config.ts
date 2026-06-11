import { defineConfig } from "cypress";

export default defineConfig({
  allowCypressEnv: false,

  e2e: {
    baseUrl: "http://localhost:4200",
    supportFile: "cypress/support/e2e.ts",
    includeShadowDom: true,
    experimentalRunAllSpecs: true,
    slowMo: 800, // ⬅️ Pausa de 800ms entre cada acción (método oficial de Cypress)
    setupNodeEvents(on, config) {
      // implement node event listeners here
    },
  },
});

import { ProfileSelectors } from '../../support/selectors';
import { clickIonButton } from '../../support/trips-helper';

describe('Perfil - Cambiar Foto de Perfil', () => {
  beforeEach(() => {
    cy.loginAsPassenger();
    cy.visit('/app/profile');
    cy.wait(1500);
  });

  it('Debe cambiar la foto de perfil en modo edición', () => {
    clickIonButton('Editar');
    cy.wait(500);

    // Use Cypress native selectFile to select a mock image
    const mockImage = Cypress.Buffer.from('fake-image-bytes');
    cy.get(ProfileSelectors.photoInput).selectFile({
      contents: mockImage,
      fileName: 'avatar.png',
      mimeType: 'image/png',
    }, { force: true });

    cy.wait(2000); // Wait for the mock upload spinner or visual completion
    
    // Save profile changes
    cy.get(ProfileSelectors.saveBtn).click({ force: true });
    cy.wait(1000);
  });
});

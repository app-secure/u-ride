/**
 * SELECTORS — Page Object Pattern para U-Ride E2E
 *
 * NOTA: Los selectores con `:contains()` no son CSS estándar.
 * Úsalos SOLO con cy.contains(), nunca con cy.get().
 * Para cy.get() usa siempre selectores CSS puros.
 */

export const AuthSelectors = {
  emailInput: 'ion-input[formControlName="email"]',
  passwordInput: 'ion-input[formControlName="password"]',
  confirmPasswordInput: 'ion-input[formControlName="password2"]',
  firstNameInput: 'ion-input[formControlName="firstName"]',
  lastNameInput: 'ion-input[formControlName="lastName"]',
  careerInput: 'ion-input[formControlName="career"]',
  phoneInput: 'ion-input[formControlName="phone"]',
  zoneInput: 'ion-input[formControlName="zone"]',
  termsCheckbox: 'ion-checkbox.terms-checkbox',
  // Selector CSS puro — funciona con cy.get()
  submitBtn: 'ion-button[type="submit"]',
  errorMessage: '.error-message, .error-msg, .invalid-feedback',
  toast: 'ion-toast',
};

export const ProfileSelectors = {
  // Botones nativos <button> — css puro, sin :contains
  editBtn: 'button.edit-btn',
  cancelBtn: 'button.cancel-btn',
  saveBtn: 'button.save-btn',
  displayNameInput: 'ion-input[formControlName="displayName"]',
  careerInput: 'ion-input[formControlName="career"]',
  phoneInput: 'ion-input[formControlName="phone"]',
  zoneInput: 'ion-input[formControlName="zone"]',
  photoInput: 'input[type="file"]',
  photoUploadBtn: 'button.photo-upload-btn',
  avatarImage: 'img.profile-avatar',
  noVehicleState: '.no-vehicle-state',
};

export const VehicleSelectors = {
  // Usar cy.contains() con estos textos para botones
  addBtnText: 'Agregar',
  submitAddBtnText: 'Agregar vehículo',
  // Inputs de vehículo — preferir input nativo, fallback ion-input
  brandInput: 'input[formControlName="brand"]',
  modelInput: 'input[formControlName="modelOrBusNumber"]',
  plateInput: 'input[formControlName="plate"]',
  colorInput: 'input[formControlName="color"]',
  seatsInput: 'input[formControlName="seats"]',
};

export const TripSelectors = {
  routeSelect: 'ion-select[formControlName="routeName"]',
  locationSelectBtns: 'button.location-select-btn',
  searchbar: 'ion-searchbar',
  // Inputs del formulario de viaje — preferir input nativo
  dateInput: 'input[formControlName="date"]',
  timeInput: 'input[formControlName="time"]',
  seatsInput: 'input[formControlName="seatsTotal"]',
  priceInput: 'input[formControlName="price"]',
  paymentMethodSelect: 'ion-select[formControlName="paymentMethod"]',
  rulesCheckbox: 'ion-checkbox',
  tripCard: '.trip-card',
  tripItem: '.trip-card',           // alias — el HTML usa .trip-card en ambos roles
  tripList: '.trip-card, .trips-grid',
  statusBadge: '.status-pill',
  // Botones dentro del card de conductor (button nativo, NO ion-button)
  startTripBtn: 'button.action-btn:contains("Iniciar")',
  finishTripBtn: 'button.action-btn:contains("Finalizar")',
  passengerInfoItem: 'ion-item .passenger-info',
  acceptPassengerBtn: 'ion-button[color="success"]',
  rejectPassengerBtn: 'ion-button[color="danger"]',
  // Textos para usar con cy.contains()
  tripCardDetailsBtnText: 'Iniciar Viaje',  // "Detalle de mi viaje" ya no existe
  startTripBtnText: 'Iniciar Viaje',
  finishTripBtnText: 'Finalizar Viaje',
  cancelBookingBtnText: '.action-btn',      // botones de acción en tarjeta pasajero
  reserveSeatBtnText: 'Reservar Asiento',
  confirmBookingBtnText: 'Confirmar Reserva',
  editTripBtnText: 'Editar',
  deleteTripBtnText: 'Eliminar',
  publishBtnText: 'Publicar Viaje',
  // Selectores CSS para botones de reserva en la página de detalle
  reserveSeatBtn: 'button.action-btn, ion-button.reserve-btn',
  confirmBookingBtn: 'ion-button[color="success"], button.confirm-btn',
};

export const NotificationSelectors = {
  triggerBtn: '#notifications-trigger',
  popover: 'ion-popover',
  popoverItem: '.notif-item',
  historyList: 'ion-list.notif-list',
  historyItem: 'ion-list.notif-list ion-item',
  unreadBadge: '.notif-badge',
};

export const ReportSelectors = {
  reasonTextarea: 'textarea[formControlName="reason"]',
  submitBtn: 'ion-button.btn-publish',
  evidenceBtn: 'button.evidence-btn',
  evidencePreviewImg: '.evidence-preview-container img',
  clearEvidenceBtn: '.evidence-preview-container .clear-btn',
  // Textos para cy.contains()
  takePhotoBtnText: 'Cámara',
  selectGalleryBtnText: 'Galería',
};

export const RatingSelectors = {
  starBtn: '.stars-selector button',
  commentTextarea: '.comment-box textarea',
  submitBtn: 'button.btn-submit',
};

export const AdminSelectors = {
  userCard: '.user-card',
  userMain: '.user-main',
  userStatusPill: '.status-pill',
  detailModal: '.detail-modal',
  detailModalCloseBtn: '.detail-modal .close-btn',
  // Botones de acción rápida en tarjeta de usuario
  quickBtn: 'button.quick-btn',
  // Botón que alterna el estado desactivado (texto varía: Activar / Desactivar)
  toggleDisabledBtn: 'button.quick-btn',
  unsuspendQuickBtn: 'button.quick-btn.warning',
  reportsList: '.reports-grid',
  reportCard: '.report-card',
  warnBtn: 'button.warn-btn',
  suspendBtn: 'button.suspend-btn',
  evidenceModalBtn: 'button.evidence-btn',
};

export const NavigationSelectors = {
  userChipTrigger: '#profile-popover-trigger',
  profilePopover: '.profile-popover',
  popoverMenu: '.profile-popover .menu',
  logoBtn: '.header-left',
  logoutBtn: 'ion-button.logout-btn',
};

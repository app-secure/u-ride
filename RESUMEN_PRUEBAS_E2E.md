# Resumen de Pruebas de Integración (Front y Sistema) con Cypress

A continuación se detalla todo lo que se implementó para cumplir con las pruebas de integración E2E, conectando el frontend con el sistema mediante Cypress, y en qué partes del proyecto se encuentran.

## 1. Dónde se encuentran las pruebas principales

El flujo completo que involucra a los 3 usuarios (Conductor, Pasajero y Administrador) se encuentra en un único archivo de integración secuencial:
- **Ruta del archivo:** `cypress/e2e/full-system-integration.cy.ts`

### ¿Qué hace este archivo?
Ejecuta la prueba de principio a fin manteniendo la coherencia de la base de datos entre cada paso:
1. **El Conductor** inicia sesión, agrega un vehículo y publica un viaje.
2. **El Pasajero** inicia sesión, busca el viaje y lo solicita.
3. **El Conductor** inicia sesión nuevamente y acepta la solicitud.
4. **El Pasajero** realiza el pago.
5. **El Conductor** arranca el viaje y lo finaliza.
6. **Ambos** se reportan o califican al terminar el viaje.
7. **El Administrador** entra al sistema, lee los reportes y suspende/advierte.

## 2. Archivos de Configuración Modificados

Para hacer que este flujo de 3 usuarios funcionara correctamente de manera automática, se modificaron/crearon las siguientes utilidades:

- **Datos de prueba (Test Data):**
  - **Ruta:** `cypress/support/test-data.ts`
  - **Qué se hizo:** Se incluyeron de forma fija las credenciales solicitadas para el **Administrador** (`bpilla9393@uta.edu.ec`), asegurando también que las de Pasajero (`kvasquez...`) y Conductor (`mramirez...`) estuviesen correctamente configuradas para ser inyectadas en las pruebas.

- **Comandos personalizados de Cypress:**
  - **Ruta:** `cypress/support/commands.ts`
  - **Qué se hizo:** Se agregó el comando `cy.loginAsAdmin()` para que, con una sola línea en el código de prueba, Cypress llene los formularios del admin y se salte la tediosa tarea manual.

## 3. Cómo ejecutar las pruebas

Si deseas ver la ejecución de todo el flujo de integración de extremo a extremo:

1. Levanta tu backend.
2. Levanta tu frontend de Angular.
3. Ejecuta en la terminal dentro de `u-ride`:
   ```bash
   npx cypress run --spec cypress/e2e/full-system-integration.cy.ts
   ```
   *O utiliza `npx cypress open` y selecciona el archivo `full-system-integration.cy.ts` para verlo paso a paso de forma visual.*

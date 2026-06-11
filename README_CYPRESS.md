# Pruebas End-to-End (E2E) con Cypress - Módulo de Usuarios

Este documento describe la configuración y los comandos necesarios para ejecutar las pruebas End-to-End simuladas para la aplicación **U-Ride** utilizando [Cypress](https://www.cypress.io/).

Estas pruebas interactúan con el DOM real (elementos Shadow DOM de Ionic como `ion-input`, `ion-button`, `ion-toast`) y validan el comportamiento frente a las reglas de negocio descritas en los casos de prueba (RF1, RF2).

## 🚀 1. Instalación de Cypress en el entorno
Dado que la aplicación Ionic/Angular utiliza dependencias legacy de Firebase, es importante ejecutar la instalación utilizando el flag `--legacy-peer-deps` para evitar conflictos:

```bash
cd u-ride
npm install cypress --save-dev --legacy-peer-deps
```

El archivo `cypress.config.ts` ya ha sido configurado en el proyecto para apuntar a la ruta local `http://localhost:4200`.

## 🖥️ 2. Ejecutar las Pruebas

Para ver las pruebas correr visualmente como si fueras un usuario, debes levantar tu aplicación y luego abrir el entorno gráfico de Cypress.

**Paso 1: Levantar la aplicación Ionic/Angular**
Abre una terminal en `u-ride` y levanta el servidor de desarrollo:
```bash
npm run start
```
*(Espera a que compile y la aplicación esté disponible en http://localhost:4200).*

**Paso 2: Abrir la interfaz de Cypress**
Abre **otra pestaña de terminal** en `u-ride` y ejecuta:
```bash
npx cypress open
```

**Paso 3: Ejecutar el Spec**
1. En la ventana que se abre, selecciona **"E2E Testing"**.
2. Selecciona el navegador de tu preferencia (ej. Chrome o Edge).
3. Haz clic en el archivo `usuarios.cy.ts`.
4. ¡Disfruta viendo a Cypress completar los formularios y validar las alertas por ti!

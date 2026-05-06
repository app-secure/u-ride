# Pruebas del Módulo Usuarios - U-Ride

Este documento detalla la estrategia de pruebas (Unitarias y de Integración) aplicadas al módulo de "Usuarios", abarcando tanto el Frontend como el Backend de la aplicación.

## 🚀 Pruebas Realizadas y Casos de Prueba (CP) Cubiertos

### Backend (xUnit + Moq)
Se crearon dos proyectos de pruebas en la solución (`Application.Tests` y `API.IntegrationTests`), validando la lógica de negocio sin depender de la base de datos real:

- **CP-RF001 (Sincronización):** Se validó que al realizar Login/Registro, el sistema guarde el nuevo usuario correctamente en la BD SQL a través del servicio (`SyncUserAsync`).
- **CP-RF002-01 (Actualización Exitosa):** Verificación de actualización del perfil, asegurando que campos como la Zona y la Carrera se guarden en el repositorio.
- **CP-RF002-02 (Errores de Actualización):** Verificación de lanzamiento de excepción `KeyNotFoundException` si se intenta actualizar un perfil inexistente.
- **RNF-001 (Seguridad - Integración):** Se simuló un cliente HTTP contra la API en memoria para garantizar que el endpoint `PUT /api/users/me` devuelva un código `401 Unauthorized` si no se envía un Token JWT válido.

### Frontend (Angular/Ionic - Karma/Jasmine)
Se verificaron los componentes y servicios responsables de comunicarse con Firebase y el Backend:

- **CP-RF001-02 (Rechazo de Dominio Inválido):** Se testeó el método `register` en `AuthService` inyectando un correo no institucional (Ej. `@gmail.com`). La promesa es rechazada con el error `EMAIL_DOMAIN_NOT_ALLOWED`.
- **CP-RF002-01 (Formulario de Perfil - Éxito):** Se verificó que el `ProfilePage` invoque correctamente el método `updateProfile` de `UsersService` si todos los campos requeridos (como "Zona") están presentes.
- **CP-RF002-02 (Formulario de Perfil - Rechazo):** Se validó que el formulario en Angular marque estado `invalid` y prevenga el envío al backend si falta información crítica.

## 🛠️ Instrucciones para Ejecutar las Pruebas

Cualquier desarrollador del equipo puede ejecutar estas pruebas localmente para confirmar que todo sigue funcionando:

### Ejecutar Pruebas del Backend
1. Abre tu terminal y dirígete a la carpeta `u-ride-backend`.
2. Ejecuta el comando:
   ```bash
   dotnet test
   ```
3. Verás en consola que todos los proyectos (`Application.Tests.dll` y `API.IntegrationTests.dll`) pasan exitosamente.

### Ejecutar Pruebas del Frontend
1. Abre tu terminal y dirígete a la carpeta `u-ride`.
2. Ejecuta el comando:
   ```bash
   npm run test
   ```
   *(Nota: Puedes agregar `-- --no-watch` si solo deseas que corran una vez sin quedarse escuchando cambios).*

## 📊 Medir la Cobertura de Código (Code Coverage)

Para auditar la calidad de las pruebas y saber exactamente qué líneas de código se evaluaron, el equipo puede generar reportes de cobertura:

### Cobertura del Backend
1. Ubícate en `u-ride-backend` y ejecuta:
   ```bash
   dotnet test --collect:"XPlat Code Coverage"
   ```
2. Esto generará archivos `coverage.cobertura.xml` dentro de las carpetas `TestResults`.
3. **Visualización:** Instala la extensión **"Coverage Gutters"** en VS Code para que el código se pinte de verde (probado) o rojo (no probado).

### Cobertura del Frontend
1. Ubícate en `u-ride` y ejecuta:
   ```bash
   npm run test -- --code-coverage
   ```
2. Al finalizar, se creará una carpeta llamada `coverage` en la raíz del frontend.
3. **Visualización:** Abre el archivo `coverage/index.html` en cualquier navegador web. Verás un sitio interactivo que muestra el porcentaje exacto de cobertura por cada archivo e indica de forma visual qué caminos lógicos (`if/else`) faltan por cubrir.

---
**Nota para el equipo:** Estas pruebas automatizadas y sus reportes de cobertura son fundamentales para asegurar que nuestras reglas de negocio principales (como el dominio @uta.edu.ec) no se rompan accidentalmente en futuros commits.

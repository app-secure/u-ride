# U-Ride - Aplicación de Carpooling Universitaria (UTA)

U-Ride es una aplicación diseñada para facilitar el transporte entre estudiantes de la Universidad Técnica de Ambato (UTA), permitiendo a los conductores publicar viajes y a los pasajeros unirse a ellos de forma segura y eficiente.

## 🚀 Guía de Inicio Rápido

Sigue estos pasos para configurar el proyecto en tu máquina local:

### 1. Requisitos Previos
Asegúrate de tener instalado:
*   [Node.js](https://nodejs.org/) (Versión LTS)
*   [Ionic CLI](https://ionicframework.com/docs/intro/cli) (`npm install -g @ionic/cli`)

### 2. Instalación de Dependencias
Clona el repositorio y ejecuta el siguiente comando (importante usar el flag de peer deps):
```bash
npm install --legacy-peer-deps
```

### 3. Ejecución en el Navegador (Modo Desarrollo)
Para probar la aplicación en tu navegador mientras programas:
```bash
ionic serve
```
La aplicación se abrirá en `http://localhost:8100`.

---

## 📱 Guía para Android (Capacitor)

Para probar el **Login con Microsoft (Outlook)** y otras funciones nativas en Android:

### 1. Construir la Web
Genera los archivos compilados de Angular:
```bash
npm run build
```

### 2. Agregar la plataforma (si no existe)
Si es la primera vez o borraste la carpeta `android`:
```bash
npx cap add android
```

### 3. Sincronizar con Android
Sincroniza los plugins nativos (incluyendo el de Autenticación):
```bash
npx cap sync android
```

### 4. Abrir en Android Studio
Para compilar la APK o probar en un emulador:
```bash
npx cap open android
```

---

## 🛠️ Tecnologías Utilizadas
*   **Framework**: Ionic + Angular
*   **Autenticación**: Firebase Auth Nativo (Microsoft)
*   **Base de Datos**: Firebase Firestore
*   **Notificaciones**: Sistema de alertas en tiempo real integrado.
*   **Mapas**: Leaflet / OpenStreetMap

---

## 📄 Notas para el Equipo
*   **Login en Android**: Se ha implementado `@capacitor-firebase/authentication` para que el inicio de sesión con el correo institucional sea nativo y estable.
*   **Reglas de Firestore**: Antes de probar, asegúrate de que las reglas en la consola de Firebase estén actualizadas según el último archivo de configuración.

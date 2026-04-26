# U-Ride - Aplicación de Carpooling Universitaria (UTA)

U-Ride es una aplicación diseñada para facilitar el transporte entre estudiantes de la Universidad Técnica de Ambato (UTA), permitiendo a los conductores publicar viajes y a los pasajeros unirse a ellos de forma segura y eficiente.

## 🚀 Guía de Inicio Rápido

Sigue estos pasos para configurar el proyecto en tu máquina local:

### 1. Requisitos Previos
Asegúrate de tener instalado:
*   [Node.js](https://nodejs.org/) (Versión LTS)
*   [Ionic CLI](https://ionicframework.com/docs/intro/cli) (`npm install -g @ionic/cli`)

### 2. Instalación de Dependencias
Clona el repositorio y ejecuta:
```bash
npm install
```

### 3. Ejecución en el Navegador (Modo Desarrollo)
Para probar la aplicación en tu navegador mientras programas:
```bash
ionic serve
```
La aplicación se abrirá en `http://localhost:8100`.

---

## 📱 Guía para Android (Capacitor)

Si necesitas generar la aplicación nativa para Android, sigue estos pasos:

### 1. Construir la Web
Genera los archivos compilados de Angular:
```bash
npm run build
```

### 2. Sincronizar con Android
Si la carpeta `android/` ya existe:
```bash
npx cap sync android
```
Si la carpeta **no** existe:
```bash
npx cap add android
```

### 3. Abrir en Android Studio
Para compilar la APK o probar en un emulador:
```bash
npx cap open android
```

---

## 🛠️ Tecnologías Utilizadas
*   **Framework**: Ionic + Angular
*   **Base de Datos**: Firebase Firestore
*   **Autenticación**: Firebase Auth (Restringido a @uta.edu.ec)
*   **Mapas**: Leaflet / OpenStreetMap

---

## 📄 Notas Importantes
*   **Reglas de Firestore**: Asegúrate de tener publicadas las reglas actualizadas en la consola de Firebase para evitar errores de permisos.
*   **Entorno**: Los archivos de configuración de Firebase se encuentran en `src/environments/`.

# 🚀 Manual Completo SonarQube (Frontend + Backend)

Este documento incluye **TODOS los pasos realizados**, incluyendo errores comunes que ocurrieron durante el proceso.

---

# 🐳 1. Levantar SonarQube con Docker

```bash
docker run -d --name sonarqube -p 9000:9000 sonarqube:lts
```

---

# 🌐 2. Acceder a SonarQube

Abrir en navegador:

```
http://localhost:9000
```

Credenciales iniciales:

```
user: admin
pass: admin
```

⚠️ Cambiar contraseña obligatoriamente

---

# 📁 3. Crear proyectos en SonarQube

Crear dos proyectos:

## Frontend
- Project Key: `u-ride`

## Backend
- Project Key: `backend-u-ride`

👉 Generar TOKEN en cada proyecto

---

# =============================
# 🔷 FRONTEND (ANGULAR)
# =============================

---

# 📂 4. Ir al proyecto

```bash
cd C:\GestionPruebas\u-ride
```

---

# 🧪 5. Ejecutar tests con coverage

```bash
ng test --code-coverage --watch=false
```

---

# ⚠️ ERROR ENCONTRADO

Errores comunes:

- ❌ No provider for HttpClient
- ❌ No provider for Auth
- ❌ TypeError en componentes
- ❌ Tests FAILED (7 u 8 fallidos)

👉 Esto **NO bloquea SonarQube**, pero baja el coverage.

---

# 📊 6. Verificar carpeta coverage

```bash
cd coverage
cd app
```

```bash
dir
```

---

# ⚠️ ERROR CRÍTICO DETECTADO

❌ No existía archivo:

```
lcov.info
```

👉 Este fue el problema principal por el cual SonarQube no mostraba coverage.

---

# 🛠️ 7. Solución en karma.conf.js

Editar:

```bash
karma.conf.js
```

Agregar o corregir:

```js
coverageReporter: {
  dir: require('path').join(__dirname, './coverage/app'),
  subdir: '.',
  reporters: [
    { type: 'html' },
    { type: 'lcov' },
    { type: 'text-summary' }
  ]
}
```

---

# 🔁 8. Re-ejecutar tests

```bash
ng test --code-coverage --watch=false
```

---

# ✅ 9. Verificar nuevamente

```bash
cd coverage\app
dir
```

👉 Ahora debe existir:

```
lcov.info
```

---

# ⚙️ 10. Crear archivo sonar-project.properties

```bash
notepad sonar-project.properties
```

Contenido:

```properties
sonar.projectKey=frontend-u-ride
sonar.projectName=Frontend U-Ride

sonar.sources=src

sonar.host.url=http://localhost:9000
sonar.token=TU_TOKEN_FRONT

sonar.javascript.lcov.reportPaths=coverage/app/lcov.info
```

---

# 🚀 11. Ejecutar análisis

```bash
sonar-scanner
```

---

# ⚠️ ERRORES ENCONTRADOS

### ❌ "sonar-scanner no reconocido"

Solución:

```bash
npm install -g sonar-scanner
```

---

### ❌ "No LCOV files were found"

👉 Causa: no existía `lcov.info`

---

### ❌ "Not authorized"

👉 Causa:
- Token incorrecto
- ProjectKey incorrecto

---

# =============================
# 🔶 BACKEND (.NET)
# =============================

---

# 📂 12. Ir al backend

```bash
cd C:\RUTA_BACKEND
```

---

# ⚙️ 13. Instalar herramienta Sonar

```bash
dotnet tool install --global dotnet-sonarscanner
```

---

# 🚀 14. Iniciar análisis

```bash
dotnet sonarscanner begin /k:"backend-u-ride" /d:sonar.host.url="http://localhost:9000" /d:sonar.token="TU_TOKEN_BACK"
```

---

# 🔨 15. Compilar

```bash
dotnet build
```

---

# 🧪 16. Ejecutar tests

```bash
dotnet test
```

---

# ✅ 17. Finalizar análisis

```bash
dotnet sonarscanner end /d:sonar.token="TU_TOKEN_BACK"
```

---

# 🔥 RESULTADO FINAL

En SonarQube:

- ✅ Proyecto Frontend visible
- ✅ Proyecto Backend visible
- ✅ Código analizado
- ⚠️ Coverage bajo (~12%) por errores en tests

---

# 🧠 CONCLUSIONES IMPORTANTES

- El problema principal fue la ausencia de `lcov.info`
- Los tests fallando no impiden el análisis
- SonarQube necesita coverage real (archivo LCOV)
- La configuración de Karma es clave

---

# 🚀 SIGUIENTE PASO (RECOMENDADO)

Arreglar tests:

- Importar HttpClientTestingModule
- Mockear servicios
- Corregir dependencias (Auth, Services)

👉 Esto subirá el coverage significativamente.

---

# ✅ FIN DEL MANUAL


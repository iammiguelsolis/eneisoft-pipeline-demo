# Guion Minuto a Minuto: Demo en Vivo ENEISOFT XVI

**Charla:** "DEL GIT PUSH A LA NUBE: Construye tu primer pipeline automatizado"  
**Ponente:** Miguel Solis (GitHub Actions Certified GH-200)  
**Track:** DevOps | ENEISOFT XVI  
**Duración Total:** 60 minutos (Demo en vivo: minutos 35 a 55)

---

## ⏱️ Cronograma General de la Charla (19:00 – 20:00)

| Bloque | Tiempo | Tema Central |
|---|---|---|
| **1. Introducción y Contexto** | 19:00 – 19:10 (10 min) | Por qué DevOps importa a los estudiantes, el dolor del despliegue manual tradicional, qué es CI/CD. |
| **2. Arquitectura de la Solución** | 19:10 – 19:25 (15 min) | Explicación del flujo: Git Push → GitHub Actions (OIDC) → ACR → AKS con Kustomize. Mostrar diagrama. |
| **3. Fundamentos de Seguridad** | 19:25 – 19:35 (10 min) | Por qué NO usamos client secrets ni JSONs: la magia de OpenID Connect (OIDC) y contenedores no-root. |
| **4. DEMO EN VIVO (El Clímax)** | **19:35 – 19:50 (15 min)** | **Edición en vivo, git push, seguimiento del pipeline y cambio en la web.** |
| **5. Bonus GitOps & Preguntas** | 19:50 – 20:00 (10 min) | Mención rápida de Argo CD, balanceo entre pods y preguntas de la audiencia. |

---

## 🎬 Paso a Paso Detallado de la Demo en Vivo (Minuto 35 a 50)

### Minuto 35: Preparación de la Pantalla y Contexto
1. **Configuración de ventanas:**
   - Mitad izquierda: **VS Code** con el proyecto abierto en `src/content.js`.
   - Mitad superior derecha: **Navegador** con la pestaña de la aplicación web en vivo (`http://<IP_PUBLICA>`).
   - Mitad inferior derecha: **Navegador** en la pestaña `Actions` del repositorio en GitHub.
2. **Lo que dices al público:**
   > *"Aquí tenemos nuestra aplicación corriendo en Azure Kubernetes Service sobre dos réplicas. Noten que nos muestra el commit actual, la versión de Node y el mensaje inicial. Ahora vamos a realizar un cambio en el código y veremos cómo viaja automáticamente hasta producción sin tocar un solo botón en la nube."*

### Minuto 37: La Edición en Vivo
1. Ve a `src/content.js`.
2. Modifica el campo `message`:
   ```javascript
   message: '¡Saludos en vivo a todo el Perú en el ENEISOFT XVI! 🚀🇵🇪',
   subtitle: 'Desplegado en AKS mediante GitHub Actions + OIDC sin contraseñas.',
   ```
3. Guarda el archivo (`Ctrl + S`).

### Minuto 38: El Git Push
1. Abre la terminal integrada en VS Code y ejecuta:
   ```bash
   git add src/content.js
   git commit -m "feat(demo): saludo especial en vivo ENEISOFT XVI"
   git push origin main
   ```
2. **Lo que dices al público:**
   > *"Acabamos de disparar el evento de webhook. Desde este momento, GitHub Actions toma el control absoluto de la entrega."*

### Minuto 39 – 42: Narrando el Pipeline en Tiempo Real

Cambia el foco a la pestaña de **GitHub Actions** en el navegador. Haz clic en el workflow que acaba de arrancar.

#### Etapa 1: Job `test` (~20 a 25 segundos)
- **Qué mostrar:** Ver cómo descarga Node.js 22, recupera la caché de npm y ejecuta Jest.
- **Qué explicar:**
  > *"La primera regla de oro de CI: si una prueba unitaria falla, el pipeline se aborta de inmediato. Nunca se compila una imagen ni se despliega código roto en producción."*

#### Etapa 2: Job `build-and-push` (~40 a 50 segundos)
- **Qué mostrar:**
  - `Azure Login via OIDC`: Destacar que no se usó ningún secret con contraseña. Se solicitó un token JWT criptográfico efímero.
  - `Docker Buildx`: La construcción multi-stage donde el build produce una imagen Alpine ligera y sin usuario root.
  - `Push a Azure Container Registry`: Las capas cacheadas se reutilizan, ahorrando tiempo y ancho de banda.
- **Qué explicar:**
  > *"Construimos la imagen inyectándole por ARG el commit SHA y la fecha exacta. La imagen queda registrada en nuestro Azure Container Registry privado."*

#### Etapa 3: Job `deploy` (~25 a 35 segundos)
- **Qué mostrar:**
  - La autenticación OIDC hacia AKS.
  - El comando `kustomize edit set image`, actualizando el tag dinámicamente sin tocar archivos YAML a mano.
  - `kubectl rollout status`: Espera activa hasta que los nuevos Pods pasen los readiness probes (`/ready`).
  - El `$GITHUB_STEP_SUMMARY`: Mostrar la tabla con el resumen final y el enlace directo.

### Minuto 43: La Revelación en Vivo en el Navegador
1. Vuelve a la pestaña de la aplicación web en vivo (`http://<IP_PUBLICA>`).
2. Espera a que el polling de 30 segundos refresque la página (o haz `F5`).
3. **Puntos visuales a resaltar:**
   - El gran titular ahora dice: **`"¡Saludos en vivo a todo el Perú en el ENEISOFT XVI! 🚀🇵🇪"`**.
   - La sección **"Este despliegue"** muestra el nuevo **Commit SHA** idéntico al que acabas de commitear.
   - El bloque **"Pipeline en vivo"** muestra el último Run con estado verde y enlace directo.
   - Haz clic en el botón **"Consultar de nuevo"** en la sección **Balanceo entre pods** para evidenciar que dos pods distintos están respondiendo alternadamente.

---

## 🛡️ Planes de Respaldo (Plan B, C y D)

En una conferencia en vivo con estudiantes, la ley de Murphy puede ocurrir (caída de internet, saturación temporal de GitHub Actions o delay en Azure). Prepárate con estos respaldos:

### Plan B: Si GitHub Actions tarda más de lo habitual en asignar un Runner
- **Explicación:** *"Los runners compartidos gratuitos de GitHub a veces entran en cola de espera por alta demanda global."*
- **Acción:** Abre una pestaña con un **Run previo exitoso** en GitHub Actions (`Summary`). Explica cada uno de los pasos con el log ya renderizado y el resumen en Markdown.

### Plan C: Si falla la conexión de red o la IP pública de Azure no responde
- **Explicación:** *"En producción siempre contamos con réplicas y cachés locales."*
- **Acción:** Ten levantado en local el contenedor previamente construido:
  ```bash
  docker run -d -p 3000:3000 --name eneisoft-local eneisoft-demo:latest
  ```
  Abre `http://localhost:3000` y muestra la página idéntica con los datos locales inyectados.

### Plan D: Grabación de Respaldo en Video (90 segundos)
- **Recomendación esencial:** Antes de la charla, graba un video de 90 segundos sin audio mostrando la pantalla dividida (push → GitHub Actions verde → refresco de la web).
- Si la red del auditorio/Meet falla totalmente, reproduces el video y narras encima: *"Esto es exactamente lo que corre bajo condiciones normales en nuestro pipeline..."*

---

## 💡 Consejos de Oratoria Técnica para Estudiantes
1. **No pidas disculpas excesivas si algo falla:** Trata los errores como oportunidades pedagógicas ("En DevOps, diseñar para el fallo es la habilidad número uno").
2. **Haz zoom en el código (Ctrl + +):** La audiencia virtual en Google Meet suele ver pantallas pequeñas; mantén la fuente de VS Code y el navegador legible (120% a 150%).
3. **Menciona la certificación GH-200:** Destaca que aprender estos flujos de trabajo con OIDC y Kustomize es el estándar evaluado en la certificación oficial de GitHub.

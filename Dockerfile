# ==========================================
# Stage 1: Build & Dependencies
# ==========================================
FROM node:22-alpine AS builder

WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar solo dependencias de producción de forma reproducible
RUN npm ci --only=production && npm cache clean --force

# ==========================================
# Stage 2: Minimal Runtime
# ==========================================
FROM node:22-alpine AS runtime

# Crear usuario y grupo sin privilegios (no-root)
RUN addgroup -g 1001 appgroup && \
    adduser -u 1001 -G appgroup -s /bin/sh -D appuser

WORKDIR /app

# Copiar node_modules limpios desde la etapa de construcción
COPY --from=builder --chown=appuser:appgroup /app/node_modules ./node_modules

# Copiar código fuente y assets públicos
COPY --chown=appuser:appgroup . .

# Argumentos de construcción pasados por el pipeline de CI/CD
ARG APP_VERSION=dev
ARG GIT_SHA=local
ARG BUILD_NUMBER=0
ARG BUILD_DATE=unknown
ARG GITHUB_REPOSITORY=local/dev

# Variables de entorno en tiempo de ejecución
ENV APP_VERSION=$APP_VERSION \
    GIT_SHA=$GIT_SHA \
    BUILD_NUMBER=$BUILD_NUMBER \
    BUILD_DATE=$BUILD_DATE \
    GITHUB_REPOSITORY=$GITHUB_REPOSITORY \
    NODE_ENV=production \
    APP_ENV=production \
    PORT=3000

# Cambiar al usuario no-root
USER appuser

# Exponer el puerto de la aplicación
EXPOSE 3000

# Verificación de salud del contenedor
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Comando de inicio del servidor
CMD ["node", "src/server.js"]

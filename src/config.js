'use strict';

/** Configuración centralizada desde variables de entorno. */
const config = {
  // Servidor
  port: parseInt(process.env.PORT, 10) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',

  // Info de build (inyectada por Docker ARG → ENV)
  appVersion: process.env.APP_VERSION || 'dev',
  gitSha: process.env.GIT_SHA || 'local',
  buildNumber: process.env.BUILD_NUMBER || '0',
  buildDate: process.env.BUILD_DATE || new Date().toISOString(),
  githubRepository: process.env.GITHUB_REPOSITORY || 'local/dev',
  appEnv: process.env.APP_ENV || 'development',

  // Kubernetes Downward API
  podName: process.env.POD_NAME || 'local',
  nodeName: process.env.NODE_NAME || 'local',
  podNamespace: process.env.POD_NAMESPACE || 'default',

  // GitHub API
  githubApiCacheTtl: 60_000, // 60 segundos
};

module.exports = config;

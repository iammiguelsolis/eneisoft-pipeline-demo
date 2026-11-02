'use strict';

const { Router } = require('express');
const config = require('../config');
const content = require('../content');
const { getLatestRun } = require('../services/github');

const router = Router();
const startTime = Date.now();

/**
 * GET /api/info
 * Devuelve información sobre este despliegue: versión, build, pod, etc.
 */
router.get('/info', (_req, res) => {
  res.json({
    content: {
      message: content.message,
      subtitle: content.subtitle,
    },
    build: {
      version: config.appVersion,
      sha: config.gitSha,
      shortSha: config.gitSha.substring(0, 7),
      buildNumber: config.buildNumber,
      buildDate: config.buildDate,
      repository: config.githubRepository,
    },
    runtime: {
      environment: config.appEnv,
      nodeVersion: process.version,
      uptime: Math.floor((Date.now() - startTime) / 1000),
    },
    kubernetes: {
      pod: config.podName,
      node: config.nodeName,
      namespace: config.podNamespace,
    },
  });
});

/**
 * GET /api/pipeline/latest
 * Devuelve el estado del último run de GitHub Actions.
 * Consulta la API pública de GitHub con caché de 60s.
 * Fallback a datos mock si falla.
 */
router.get('/pipeline/latest', async (_req, res) => {
  try {
    const run = await getLatestRun(config.githubRepository);
    res.json(run);
  } catch (err) {
    console.error('[pipeline/latest] Error:', err.message);
    res.status(502).json({
      error: 'No se pudo obtener el estado del pipeline',
      fallback: true,
    });
  }
});

module.exports = router;

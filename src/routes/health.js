'use strict';

const { Router } = require('express');

const router = Router();

let ready = true;

/**
 * GET /health — Liveness probe.
 * Siempre responde 200 si el proceso está vivo.
 */
router.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

/**
 * GET /ready — Readiness probe.
 * Responde 200 cuando la app está lista para recibir tráfico.
 */
router.get('/ready', (_req, res) => {
  if (ready) {
    res.status(200).json({ status: 'ready' });
  } else {
    res.status(503).json({ status: 'not ready' });
  }
});

/** Permite desactivar el readiness (útil para apagado ordenado). */
router.setReady = (value) => { ready = value; };

module.exports = router;

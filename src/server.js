'use strict';

const express = require('express');
const helmet = require('helmet');
const path = require('path');
const config = require('./config');
const healthRoutes = require('./routes/health');
const apiRoutes = require('./routes/api');

const app = express();

// ── Seguridad ──────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: false,
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:'],
      connectSrc: ["'self'", 'https://api.github.com'],
    },
  },
  // Disable HTTPS-only headers (no TLS termination on this service)
  hsts: false,
  crossOriginOpenerPolicy: false,
  originAgentCluster: false,
}));

// ── Archivos estáticos ────────────────────────────────────
app.use(express.static(path.join(__dirname, '..', 'public'), {
  maxAge: config.nodeEnv === 'production' ? '1h' : 0,
}));

// ── Rutas ──────────────────────────────────────────────────
app.use('/', healthRoutes);
app.use('/api', apiRoutes);

// ── Fallback: SPA ──────────────────────────────────────────
app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// ── Manejo de errores ──────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('[ERROR]', err.message);
  res.status(500).json({ error: 'Error interno del servidor' });
});

// ── Inicio del servidor ────────────────────────────────────
let server;

function start() {
  return new Promise((resolve) => {
    server = app.listen(config.port, () => {
      console.log(`[eneisoft-demo] Escuchando en :${config.port} (${config.appEnv})`);
      resolve(server);
    });
  });
}

// ── Apagado ordenado ───────────────────────────────────────
function shutdown(signal) {
  console.log(`[eneisoft-demo] ${signal} recibido, cerrando servidor...`);
  if (server) {
    server.close(() => {
      console.log('[eneisoft-demo] Servidor cerrado.');
      process.exit(0);
    });
    // Forzar cierre si tarda más de 10s
    setTimeout(() => {
      console.warn('[eneisoft-demo] Cierre forzado tras 10s.');
      process.exit(1);
    }, 10_000);
  } else {
    process.exit(0);
  }
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Solo arranca si es el módulo principal (no en tests)
if (require.main === module) {
  start();
}

module.exports = { app, start };

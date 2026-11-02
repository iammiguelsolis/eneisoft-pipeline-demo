'use strict';

const request = require('supertest');
const { app } = require('../src/server');

describe('GET /api/info', () => {
  test('devuelve 200 con la estructura esperada', async () => {
    const res = await request(app).get('/api/info');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('content');
    expect(res.body).toHaveProperty('build');
    expect(res.body).toHaveProperty('runtime');
    expect(res.body).toHaveProperty('kubernetes');

    // Content
    expect(res.body.content).toHaveProperty('message');
    expect(res.body.content).toHaveProperty('subtitle');
    expect(typeof res.body.content.message).toBe('string');

    // Build
    expect(res.body.build).toHaveProperty('version');
    expect(res.body.build).toHaveProperty('sha');
    expect(res.body.build).toHaveProperty('shortSha');
    expect(res.body.build).toHaveProperty('buildNumber');
    expect(res.body.build).toHaveProperty('buildDate');
    expect(res.body.build).toHaveProperty('repository');

    // Runtime
    expect(res.body.runtime).toHaveProperty('environment');
    expect(res.body.runtime).toHaveProperty('nodeVersion');
    expect(res.body.runtime).toHaveProperty('uptime');
    expect(typeof res.body.runtime.uptime).toBe('number');

    // Kubernetes
    expect(res.body.kubernetes).toHaveProperty('pod');
    expect(res.body.kubernetes).toHaveProperty('node');
    expect(res.body.kubernetes).toHaveProperty('namespace');
  });
});

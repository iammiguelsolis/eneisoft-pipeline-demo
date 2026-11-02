'use strict';

const request = require('supertest');
const { app } = require('../src/server');
const { clearCache } = require('../src/services/github');

describe('GET /api/pipeline/latest', () => {
  beforeEach(() => {
    clearCache();
  });

  test('devuelve 200 con datos (mock en desarrollo local)', async () => {
    const res = await request(app).get('/api/pipeline/latest');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status');
    expect(res.body).toHaveProperty('conclusion');
    expect(res.body).toHaveProperty('run_number');
    expect(res.body).toHaveProperty('head_sha');
  });

  test('devuelve datos de fallback cuando GITHUB_REPOSITORY es local/dev', async () => {
    const res = await request(app).get('/api/pipeline/latest');

    expect(res.status).toBe(200);
    // En dev local, el repo es "local/dev", así que devuelve mock
    expect(typeof res.body.message).toBe('string');
  });
});

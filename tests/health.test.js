'use strict';

const request = require('supertest');
const { app } = require('../src/server');

describe('Health endpoints', () => {
  test('GET /health devuelve 200 con status ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  test('GET /ready devuelve 200 con status ready', async () => {
    const res = await request(app).get('/ready');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ready' });
  });
});

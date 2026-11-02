'use strict';

const request = require('supertest');
const { app } = require('../src/server');
const githubService = require('../src/services/github');

describe('GET /api/pipeline/latest', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    githubService.clearCache();
  });

  test('devuelve 200 con estructura de pipeline esperada', async () => {
    jest.spyOn(githubService, 'getLatestRun').mockResolvedValue(githubService.MOCK_RUN);

    const res = await request(app).get('/api/pipeline/latest');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status');
    expect(res.body).toHaveProperty('conclusion');
    expect(res.body).toHaveProperty('run_number');
    expect(res.body).toHaveProperty('head_sha');
    expect(res.body).toHaveProperty('message');
  });

  test('devuelve datos mock cuando el repositorio es local/dev', async () => {
    const data = await githubService.getLatestRun('local/dev');

    expect(data).toHaveProperty('demo', true);
    expect(data).toHaveProperty('status', 'completed');
    expect(typeof data.message).toBe('string');
  });

  test('devuelve fallback elegante cuando la API de GitHub falla', async () => {
    jest.spyOn(global, 'fetch').mockRejectedValue(new Error('GitHub API timeout'));

    const data = await githubService.getLatestRun('owner/repo-test');

    expect(data).toHaveProperty('demo', true);
    expect(data.message).toContain('GitHub API timeout');
  });

  test('procesa y cachea respuesta exitosa de la API de GitHub', async () => {
    const mockWorkflowData = {
      workflow_runs: [
        {
          status: 'completed',
          conclusion: 'success',
          run_number: 10,
          head_sha: '1234567890abcdef',
          head_branch: 'main',
          actor: { login: 'octocat', avatar_url: 'https://github.com/octocat.png' },
          created_at: '2026-11-03T19:00:00Z',
          updated_at: '2026-11-03T19:01:30Z',
          html_url: 'https://github.com/octocat/repo/actions/runs/10',
          name: 'CI/CD Pipeline',
          display_title: 'test commit',
        },
      ],
    };

    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => mockWorkflowData,
    });

    const data = await githubService.getLatestRun('owner/repo-test');

    expect(data.demo).toBe(false);
    expect(data.status).toBe('completed');
    expect(data.conclusion).toBe('success');
    expect(data.run_number).toBe(10);
    expect(data.short_sha).toBe('1234567');
    expect(data.actor).toBe('octocat');
    expect(data.duration_seconds).toBe(90);
  });
});

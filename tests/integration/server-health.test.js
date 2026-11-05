import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../../backend/src/app.js';

describe('Single-Port Server & Express Foundation', () => {
  const app = createApp();

  it('responds with 200 and healthy status on /api/health', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'ok');
    expect(res.body).toHaveProperty('service', 'premium-voting-application');
    expect(res.body).toHaveProperty('timestamp');
  });

  it('correctly handles unknown API routes with 404', async () => {
    const res = await request(app).get('/api/unknown-endpoint');
    // Default or app handled 404
    expect([404]).toContain(res.status);
  });
});


import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import express from 'express';
import { createApp } from '../../backend/src/app.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.resolve(__dirname, '../../frontend/dist');

describe('Phase 10 Production Mode & Single-Port Static Serving', () => {
  let prodApp;

  beforeAll(() => {
    // Verify frontend build dist exists
    expect(fs.existsSync(distPath)).toBe(true);
    expect(fs.existsSync(path.resolve(distPath, 'index.html'))).toBe(true);

    // Initialize Express in production static mode
    prodApp = createApp();
    prodApp.use(express.static(distPath));

    // SPA fallback
    prodApp.get('*', (req, res, next) => {
      if (req.originalUrl.startsWith('/api')) return next();
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  });

  it('serves production index.html on root /', async () => {
    const res = await request(prodApp).get('/');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/html/);
    expect(res.text).toContain('<!DOCTYPE html>');
    expect(res.text).toContain('<div id="root">');
  });

  it('serves production SPA fallback on client routes such as /admin and /vote', async () => {
    const adminRes = await request(prodApp).get('/admin');
    expect(adminRes.status).toBe(200);
    expect(adminRes.headers['content-type']).toMatch(/text\/html/);
    expect(adminRes.text).toContain('<!DOCTYPE html>');

    const voteRes = await request(prodApp).get('/vote?token=test_token');
    expect(voteRes.status).toBe(200);
    expect(voteRes.headers['content-type']).toMatch(/text\/html/);
  });

  it('serves API endpoints on the same port at /api/*', async () => {
    const healthRes = await request(prodApp).get('/api/health');
    expect(healthRes.status).toBe(200);
    expect(healthRes.body.status).toBe('ok');

    const setupRes = await request(prodApp).get('/api/auth/setup-status');
    expect(setupRes.status).toBe(200);
    expect(setupRes.body).toHaveProperty('setupRequired');
  });
});


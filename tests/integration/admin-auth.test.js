import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../backend/src/app.js';
import { pool, query } from '../../backend/src/database/pool.js';

describe('Phase 3 Admin Authentication & One-Time Setup', () => {
  const app = createApp();

  beforeAll(async () => {
    // Ensure clean admins table for test suite
    await query('DELETE FROM admins WHERE email != 'admin@luxuryvoting.com'');
  });

  afterAll(async () => {
    // Keep database in zero seed state
    await query('DELETE FROM admins WHERE email != 'admin@luxuryvoting.com'');
    await pool.end();
  });

  it('reports setupRequired: true when zero admins exist', async () => {
    const res = await request(app).get('/api/auth/setup-status');
    expect(res.status).toBe(200);
    expect(res.body.setupRequired).toBe(true);
    expect(res.body.adminCount).toBe(0);
  });

  it('rejects setup with invalid/weak password', async () => {
    const res = await request(app)
      .post('/api/auth/setup')
      .send({
        fullName: 'Admin User',
        email: 'admin@event.com',
        password: 'weak', // Does not satisfy password rules
      });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
    expect(res.body.details).toBeDefined();
  });

  it('successfully creates the initial administrator and issues auth cookie', async () => {
    const res = await request(app)
      .post('/api/auth/setup')
      .send({
        fullName: 'System Administrator',
        email: 'lead_admin@event.com',
        password: 'SecurePassword123!',
      });

    expect(res.status).toBe(201);
    expect(res.body.admin).toHaveProperty('id');
    expect(res.body.admin.email).toBe('lead_admin@event.com');
    expect(res.headers['set-cookie']).toBeDefined();
    expect(res.headers['set-cookie'][0]).toContain('admin_token');
  });

  it('permanently locks setup once first administrator is created (HTTP 403)', async () => {
    const res = await request(app)
      .post('/api/auth/setup')
      .send({
        fullName: 'Imposter Admin',
        email: 'imposter@event.com',
        password: 'SecurePassword123!',
      });

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('SETUP_LOCKED');
  });

  it('reports setupRequired: false after admin creation', async () => {
    const res = await request(app).get('/api/auth/setup-status');
    expect(res.status).toBe(200);
    expect(res.body.setupRequired).toBe(false);
    expect(res.body.adminCount).toBe(1);
  });

  it('rejects login with wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'lead_admin@event.com',
        password: 'WrongPassword999!',
      });

    expect(res.status).toBe(401);
    expect(res.body.code).toBe('INVALID_CREDENTIALS');
  });

  it('successfully logs in with valid credentials and accesses /api/auth/me', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'lead_admin@event.com',
        password: 'SecurePassword123!',
      });

    expect(loginRes.status).toBe(200);
    const cookie = loginRes.headers['set-cookie'];
    expect(cookie).toBeDefined();

    // Access protected route using HTTP cookie
    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Cookie', cookie);

    expect(meRes.status).toBe(200);
    expect(meRes.body.admin.email).toBe('lead_admin@event.com');
    expect(meRes.body.admin.fullName).toBe('System Administrator');
  });

  it('successfully logs out and clears cookie', async () => {
    const logoutRes = await request(app).post('/api/auth/logout');
    expect(logoutRes.status).toBe(200);
    const cookie = logoutRes.headers['set-cookie'][0];
    expect(cookie).toMatch(/admin_token=;/);
  });
});


import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../backend/src/app.js';
import { pool, query } from '../../backend/src/database/pool.js';

describe('Phase 4 Management APIs Integration Tests', () => {
  const app = createApp();
  let adminCookie;
  let testMemberId;
  let testEventId;
  let rawAccessToken;

  beforeAll(async () => {
    // 1. Clean test tables
    await query('DELETE FROM ballot_choices');
    await query('DELETE FROM ballots');
    await query('DELETE FROM voter_participation');
    await query('DELETE FROM category_candidates');
    await query('DELETE FROM event_members');
    await query('DELETE FROM categories');
    await query('DELETE FROM events');
    await query('DELETE FROM members');
    await query('DELETE FROM admins WHERE email != 'admin@luxuryvoting.com'');

    // 2. Setup admin account and retrieve session cookie
    const setupRes = await request(app)
      .post('/api/auth/setup')
      .send({
        fullName: 'Phase 4 Admin',
        email: 'phase4_admin@event.com',
        password: 'AdminPassword123!',
      });
    adminCookie = setupRes.headers['set-cookie'];
  });

  afterAll(async () => {
    // Clean database back to zero seed state
    await query('DELETE FROM ballot_choices');
    await query('DELETE FROM ballots');
    await query('DELETE FROM voter_participation');
    await query('DELETE FROM category_candidates');
    await query('DELETE FROM event_members');
    await query('DELETE FROM categories');
    await query('DELETE FROM events');
    await query('DELETE FROM members');
    await query('DELETE FROM admins WHERE email != 'admin@luxuryvoting.com'');
    await pool.end();
  });

  describe('Member Management APIs (/api/members)', () => {
    it('creates a new member successfully', async () => {
      const res = await request(app)
        .post('/api/members')
        .set('Cookie', adminCookie)
        .send({
          memberCode: 'MEM-001',
          fullName: 'Alexander Wright',
          isActive: true,
        });

      expect(res.status).toBe(201);
      expect(res.body.member).toHaveProperty('id');
      expect(res.body.member.member_code).toBe('MEM-001');
      testMemberId = res.body.member.id;
    });

    it('rejects duplicate member_code (409 Conflict)', async () => {
      const res = await request(app)
        .post('/api/members')
        .set('Cookie', adminCookie)
        .send({
          memberCode: 'MEM-001',
          fullName: 'Duplicate Alexander',
        });

      expect(res.status).toBe(409);
      expect(res.body.code).toBe('DUPLICATE_MEMBER_CODE');
    });

    it('lists members with search filter', async () => {
      const res = await request(app)
        .get('/api/members?search=Alexander')
        .set('Cookie', adminCookie);

      expect(res.status).toBe(200);
      expect(res.body.members).toHaveLength(1);
      expect(res.body.members[0].full_name).toBe('Alexander Wright');
    });

    it('imports members via CSV format', async () => {
      const csv = `member_code,full_name
MEM-002,Beatrice Montgomery
MEM-003,Charles Pemberton
MEM-004,Diana Sterling`;

      const res = await request(app)
        .post('/api/members/import-csv')
        .set('Cookie', adminCookie)
        .send({ csvContent: csv });

      expect(res.status).toBe(200);
      expect(res.body.importedCount).toBe(3);
    });

    it('deactivates a member successfully', async () => {
      const res = await request(app)
        .patch(`/api/members/${testMemberId}/deactivate`)
        .set('Cookie', adminCookie);

      expect(res.status).toBe(200);
      expect(res.body.member.is_active).toBe(false);
    });
  });

  describe('Event & Category Management APIs (/api/events)', () => {
    it('creates an event with default categories and returns raw access token', async () => {
      const now = new Date();
      const startAt = new Date(now.getTime() - 1000 * 60).toISOString(); // 1 minute ago (active)
      const endAt = new Date(now.getTime() + 1000 * 60 * 60 * 2).toISOString(); // 2 hours later

      const res = await request(app)
        .post('/api/events')
        .set('Cookie', adminCookie)
        .send({
          title: 'Annual 2026',
          description: 'Prestigious voting evening',
          startAt,
          endAt,
          categories: ['Best Dressing', 'Best Speech'],
        });

      expect(res.status).toBe(201);
      expect(res.body.event).toHaveProperty('id');
      expect(res.body.event.rawAccessToken).toBeDefined();
      expect(res.body.event.categories).toHaveLength(2);

      testEventId = res.body.event.id;
      rawAccessToken = res.body.event.rawAccessToken;
    });

    it('registers event members and automatically links them as category candidates', async () => {
      // Fetch all member IDs
      const membersRes = await query('SELECT id FROM members');
      const memberIds = membersRes.rows.map((r) => r.id);

      const res = await request(app)
        .post(`/api/events/${testEventId}/members`)
        .set('Cookie', adminCookie)
        .send({
          memberIds,
          isEligible: true,
        });

      expect(res.status).toBe(200);
      expect(res.body.enrolledCount).toBe(4);

      // Verify category_candidates populated for both categories (4 members * 2 categories = 8 entries)
      const candidatesRes = await query(
        'SELECT count(*)::int AS count FROM category_candidates WHERE event_id = $1',
        [testEventId]
      );
      expect(candidatesRes.rows[0].count).toBe(8);
    });

    it('supports adding a new voting category dynamically', async () => {
      const res = await request(app)
        .post(`/api/events/${testEventId}/categories`)
        .set('Cookie', adminCookie)
        .send({ name: 'Most Congenial' });

      expect(res.status).toBe(201);
      expect(res.body.category.name).toBe('Most Congenial');

      // Candidate check for the new category (4 candidates automatically enrolled)
      const newCatCandidates = await query(
        'SELECT count(*)::int AS count FROM category_candidates WHERE category_id = $1',
        [res.body.category.id]
      );
      expect(newCatCandidates.rows[0].count).toBe(4);
    });
  });

  describe('QR Access & Public Lookups (/api/qr & /api/public/events)', () => {
    it('validates public QR token and returns event details', async () => {
      const res = await request(app).get(`/api/qr/access/${rawAccessToken}`);
      expect(res.status).toBe(200);
      expect(res.body.event.title).toBe('Annual 2026');
      expect(res.body.event.votingAvailability).toBe('open');
    });

    it('lists eligible members via public event endpoint with valid token', async () => {
      const res = await request(app).get(
        `/api/public/events/${testEventId}/eligible-members?token=${rawAccessToken}`
      );
      expect(res.status).toBe(200);
      expect(res.body.members.length).toBeGreaterThan(0);
      expect(res.body.members[0]).toHaveProperty('full_name');
      expect(res.body.members[0]).toHaveProperty('has_voted');
    });

    it('regenerates QR access token and renders new QR image data URL', async () => {
      const res = await request(app)
        .post(`/api/qr/regenerate/${testEventId}`)
        .set('Cookie', adminCookie);

      expect(res.status).toBe(200);
      expect(res.body.rawToken).toBeDefined();
      expect(res.body.qrDataUrl).toMatch(/^data:image\/png;base64,/);

      // Verify old token is now invalid (404)
      const oldCheck = await request(app).get(`/api/qr/access/${rawAccessToken}`);
      expect(oldCheck.status).toBe(404);
      expect(oldCheck.body.code).toBe('INVALID_QR_TOKEN');
    });
  });
});


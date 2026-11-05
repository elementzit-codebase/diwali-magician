import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../backend/src/app.js';
import { pool, query } from '../../backend/src/database/pool.js';

describe('Phase 5 Voting Engine & Security Transaction Tests', () => {
  const app = createApp();
  let adminCookie;
  let eventId;
  let rawToken;
  let member1, member2, member3;
  let categoryDressingId, categorySpeechId;

  beforeAll(async () => {
    // 1. Wipe test data
    await query('DELETE FROM ballot_choices');
    await query('DELETE FROM ballots');
    await query('DELETE FROM voter_participation');
    await query('DELETE FROM category_candidates');
    await query('DELETE FROM event_members');
    await query('DELETE FROM categories');
    await query('DELETE FROM events');
    await query('DELETE FROM members');
    await query('DELETE FROM admins WHERE email != 'admin@luxuryvoting.com'');

    // 2. Setup admin
    const setupRes = await request(app)
      .post('/api/auth/setup')
      .send({
        fullName: 'Voting Test Admin',
        email: 'voting_admin@event.com',
        password: 'AdminPassword123!',
      });
    adminCookie = setupRes.headers['set-cookie'];

    // 3. Create 3 test members
    const m1 = await query(`
      INSERT INTO members (member_code, full_name, is_active)
      VALUES ('MEM-01', 'Alice Vance', true) RETURNING id, full_name
    `);
    member1 = m1.rows[0];

    const m2 = await query(`
      INSERT INTO members (member_code, full_name, is_active)
      VALUES ('MEM-02', 'Bob Smith', true) RETURNING id, full_name
    `);
    member2 = m2.rows[0];

    const m3 = await query(`
      INSERT INTO members (member_code, full_name, is_active)
      VALUES ('MEM-03', 'Charlie Brown', true) RETURNING id, full_name
    `);
    member3 = m3.rows[0];

    // 4. Create active event
    const now = new Date();
    const eventRes = await request(app)
      .post('/api/events')
      .set('Cookie', adminCookie)
      .send({
        title: 'Awards Voting Live',
        startAt: new Date(now.getTime() - 60000).toISOString(),
        endAt: new Date(now.getTime() + 7200000).toISOString(),
        categories: ['Best Dressing', 'Best Speech'],
      });

    eventId = eventRes.body.event.id;
    rawToken = eventRes.body.event.rawAccessToken;

    const catsRes = await query('SELECT id, name FROM categories WHERE event_id = $1', [eventId]);
    categoryDressingId = catsRes.rows.find((c) => c.name === 'Best Dressing').id;
    categorySpeechId = catsRes.rows.find((c) => c.name === 'Best Speech').id;

    // 5. Register all 3 members as eligible
    await request(app)
      .post(`/api/events/${eventId}/members`)
      .set('Cookie', adminCookie)
      .send({
        memberIds: [member1.id, member2.id, member3.id],
        isEligible: true,
      });
  });

  afterAll(async () => {
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

  describe('Step 4 & 5: Voter Session & Self-Voting Candidate Exclusion', () => {
    let aliceSessionCookie;

    it('creates a signed HTTP-only voter session cookie for Alice', async () => {
      const res = await request(app)
        .post('/api/voting/session')
        .send({
          eventId,
          memberId: member1.id,
          token: rawToken,
        });

      expect(res.status).toBe(200);
      aliceSessionCookie = res.headers['set-cookie'];
      expect(aliceSessionCookie).toBeDefined();
      expect(aliceSessionCookie[0]).toContain('voting_session');
    });

    it('enforces Rule 2.3 #5: Excludes Alice from candidate choices in all categories', async () => {
      const res = await request(app)
        .get('/api/voting/ballot-context')
        .set('Cookie', aliceSessionCookie);

      expect(res.status).toBe(200);
      expect(res.body.categories).toHaveLength(2);

      for (const cat of res.body.categories) {
        const candidateNames = cat.candidates.map((c) => c.fullName);
        expect(candidateNames).not.toContain('Alice Vance'); // Self excluded!
        expect(candidateNames).toContain('Bob Smith');
        expect(candidateNames).toContain('Charlie Brown');
      }
    });

    it('rejects ballot submission if Alice attempts to submit a vote for herself', async () => {
      const res = await request(app)
        .post('/api/voting/submit')
        .set('Cookie', aliceSessionCookie)
        .send({
          choices: [
            { categoryId: categoryDressingId, candidateMemberId: member1.id }, // Alice self-voting!
            { categoryId: categorySpeechId, candidateMemberId: member2.id },
          ],
        });

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('SELF_VOTING_PROHIBITED');
    });

    it('rejects incomplete ballot (submitting for only 1 of 2 required categories)', async () => {
      const res = await request(app)
        .post('/api/voting/submit')
        .set('Cookie', aliceSessionCookie)
        .send({
          choices: [
            { categoryId: categoryDressingId, candidateMemberId: member2.id },
          ],
        });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('INCOMPLETE_BALLOT');
    });

    it('successfully submits valid ballot for Alice and clears session cookie', async () => {
      const res = await request(app)
        .post('/api/voting/submit')
        .set('Cookie', aliceSessionCookie)
        .send({
          choices: [
            { categoryId: categoryDressingId, candidateMemberId: member2.id }, // Bob
            { categoryId: categorySpeechId, candidateMemberId: member3.id },   // Charlie
          ],
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('Ballot successfully recorded');
      expect(res.headers['set-cookie'][0]).toMatch(/voting_session=;/); // Cleared!

      // Check participation record in DB
      const partCheck = await query(
        'SELECT 1 FROM voter_participation WHERE event_id = $1 AND member_id = $2',
        [eventId, member1.id]
      );
      expect(partCheck.rowCount).toBe(1);

      // Check confidential ballots count (no memberId stored)
      const ballotsCheck = await query('SELECT count(*)::int AS count FROM ballots WHERE event_id = $1', [eventId]);
      expect(ballotsCheck.rows[0].count).toBe(1);
    });

    it('prevents Alice from creating a new voting session after having voted', async () => {
      const res = await request(app)
        .post('/api/voting/session')
        .send({
          eventId,
          memberId: member1.id,
          token: rawToken,
        });

      expect(res.status).toBe(409);
      expect(res.body.code).toBe('ALREADY_VOTED');
    });
  });

  describe('Concurrency & Race-Condition Double-Voting Guard', () => {
    it('handles simultaneous concurrent submissions gracefully with exactly one success', async () => {
      // Create session for Bob
      const sessionRes = await request(app)
        .post('/api/voting/session')
        .send({
          eventId,
          memberId: member2.id,
          token: rawToken,
        });
      const bobSessionCookie = sessionRes.headers['set-cookie'];

      // Send 5 parallel submissions for Bob at the exact same millisecond
      const parallelRequests = Array(5)
        .fill(null)
        .map(() =>
          request(app)
            .post('/api/voting/submit')
            .set('Cookie', bobSessionCookie)
            .send({
              choices: [
                { categoryId: categoryDressingId, candidateMemberId: member1.id },
                { categoryId: categorySpeechId, candidateMemberId: member3.id },
              ],
            })
        );

      const responses = await Promise.all(parallelRequests);
      const successfulSubmissions = responses.filter((r) => r.status === 200);
      const rejectedSubmissions = responses.filter((r) => r.status === 409 || r.status === 401);

      // Exactly 1 submission must succeed
      expect(successfulSubmissions.length).toBe(1);
      // Remaining 4 must be rejected (either ALREADY_VOTED 409 or session cleared 401)
      expect(rejectedSubmissions.length).toBe(4);

      // Verify voter_participation has strictly 1 record for Bob
      const partCount = await query(
        'SELECT count(*)::int AS count FROM voter_participation WHERE event_id = $1 AND member_id = $2',
        [eventId, member2.id]
      );
      expect(partCount.rows[0].count).toBe(1);
    });
  });
});


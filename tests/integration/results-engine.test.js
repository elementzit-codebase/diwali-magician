import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../backend/src/app.js';
import { pool, query } from '../../backend/src/database/pool.js';

describe('Phase 8 Results Engine & Joint Winners Tests', () => {
  const app = createApp();
  let adminCookie;
  let eventId;
  let rawToken;
  let m1, m2, m3, m4;
  let catDressing, catSpeech, catZero;

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
    await query('DELETE FROM admins');

    // 2. Setup admin
    const setupRes = await request(app)
      .post('/api/auth/setup')
      .send({
        fullName: 'Results Admin',
        email: 'results_admin@event.com',
        password: 'AdminPassword123!',
      });
    adminCookie = setupRes.headers['set-cookie'];

    // 3. Create 4 members
    const r1 = await query(`INSERT INTO members (member_code, full_name) VALUES ('M1', 'Rahul Sharma') RETURNING id`);
    const r2 = await query(`INSERT INTO members (member_code, full_name) VALUES ('M2', 'John Doe') RETURNING id`);
    const r3 = await query(`INSERT INTO members (member_code, full_name) VALUES ('M3', 'David Miller') RETURNING id`);
    const r4 = await query(`INSERT INTO members (member_code, full_name) VALUES ('M4', 'Arun Kumar') RETURNING id`);
    m1 = r1.rows[0].id;
    m2 = r2.rows[0].id;
    m3 = r3.rows[0].id;
    m4 = r4.rows[0].id;

    // 4. Create active event
    const now = new Date();
    const eventRes = await request(app)
      .post('/api/events')
      .set('Cookie', adminCookie)
      .send({
        title: 'Annual 2026 Results Test',
        startAt: new Date(now.getTime() - 120000).toISOString(),
        endAt: new Date(now.getTime() + 7200000).toISOString(), // 2 hrs later (active)
        categories: ['Best Dressing', 'Best Speech'],
      });
    eventId = eventRes.body.event.id;
    rawToken = eventRes.body.event.rawAccessToken;

    // Add 3rd category with zero votes
    const catZeroRes = await request(app)
      .post(`/api/events/${eventId}/categories`)
      .set('Cookie', adminCookie)
      .send({ name: 'Best Innovation' });
    catZero = catZeroRes.body.category.id;

    const catsRes = await query('SELECT id, name FROM categories WHERE event_id = $1', [eventId]);
    catDressing = catsRes.rows.find((c) => c.name === 'Best Dressing').id;
    catSpeech = catsRes.rows.find((c) => c.name === 'Best Speech').id;

    // 5. Enroll all 4 members
    await request(app)
      .post(`/api/events/${eventId}/members`)
      .set('Cookie', adminCookie)
      .send({ memberIds: [m1, m2, m3, m4], isEligible: true });

    // 6. Directly insert sample votes to simulate requirement tie example:
    // Best Dressing: Rahul: 2 votes, John: 2 votes (Joint Winners), David: 1 vote
    // Best Speech: Arun: 3 votes (Single Winner)

    // Ballot 1
    const b1 = await query(`INSERT INTO ballots (event_id) VALUES ($1) RETURNING id`, [eventId]);
    await query(`INSERT INTO ballot_choices (ballot_id, event_id, category_id, candidate_member_id) VALUES ($1, $2, $3, $4)`, [b1.rows[0].id, eventId, catDressing, m1]); // Rahul
    await query(`INSERT INTO ballot_choices (ballot_id, event_id, category_id, candidate_member_id) VALUES ($1, $2, $3, $4)`, [b1.rows[0].id, eventId, catSpeech, m4]);    // Arun
    await query(`INSERT INTO voter_participation (event_id, member_id) VALUES ($1, $2)`, [eventId, m1]);

    // Ballot 2
    const b2 = await query(`INSERT INTO ballots (event_id) VALUES ($1) RETURNING id`, [eventId]);
    await query(`INSERT INTO ballot_choices (ballot_id, event_id, category_id, candidate_member_id) VALUES ($1, $2, $3, $4)`, [b2.rows[0].id, eventId, catDressing, m1]); // Rahul
    await query(`INSERT INTO ballot_choices (ballot_id, event_id, category_id, candidate_member_id) VALUES ($1, $2, $3, $4)`, [b2.rows[0].id, eventId, catSpeech, m4]);    // Arun
    await query(`INSERT INTO voter_participation (event_id, member_id) VALUES ($1, $2)`, [eventId, m2]);

    // Ballot 3
    const b3 = await query(`INSERT INTO ballots (event_id) VALUES ($1) RETURNING id`, [eventId]);
    await query(`INSERT INTO ballot_choices (ballot_id, event_id, category_id, candidate_member_id) VALUES ($1, $2, $3, $4)`, [b3.rows[0].id, eventId, catDressing, m2]); // John
    await query(`INSERT INTO ballot_choices (ballot_id, event_id, category_id, candidate_member_id) VALUES ($1, $2, $3, $4)`, [b3.rows[0].id, eventId, catSpeech, m4]);    // Arun
    await query(`INSERT INTO voter_participation (event_id, member_id) VALUES ($1, $2)`, [eventId, m3]);

    // Ballot 4
    const b4 = await query(`INSERT INTO ballots (event_id) VALUES ($1) RETURNING id`, [eventId]);
    await query(`INSERT INTO ballot_choices (ballot_id, event_id, category_id, candidate_member_id) VALUES ($1, $2, $3, $4)`, [b4.rows[0].id, eventId, catDressing, m2]); // John
    await query(`INSERT INTO ballot_choices (ballot_id, event_id, category_id, candidate_member_id) VALUES ($1, $2, $3, $4)`, [b4.rows[0].id, eventId, catSpeech, m3]);    // David
    await query(`INSERT INTO voter_participation (event_id, member_id) VALUES ($1, $2)`, [eventId, m4]);
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
    await query('DELETE FROM admins');
    await pool.end();
  });

  it('strictly seals results and returns 403 while event is still active', async () => {
    const res = await request(app)
      .get(`/api/results/admin/${eventId}`)
      .set('Cookie', adminCookie);

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('RESULTS_SEALED');
  });

  it('returns verified results and joint winners after voting is closed', async () => {
    // Admin closes event early
    await request(app)
      .post(`/api/events/${eventId}/close`)
      .set('Cookie', adminCookie);

    const res = await request(app)
      .get(`/api/results/admin/${eventId}`)
      .set('Cookie', adminCookie);

    expect(res.status).toBe(200);
    expect(res.body.statistics.ballotsCast).toBe(4);
    expect(res.body.statistics.totalEligible).toBe(4);
    expect(res.body.statistics.participationPercentage).toBe(100);

    const dressingResult = res.body.results.find((r) => r.categoryName === 'Best Dressing');
    expect(dressingResult.hasVotes).toBe(true);
    expect(dressingResult.isJointWinner).toBe(true);
    expect(dressingResult.winners).toHaveLength(2); // Rahul & John tied with 2 votes each
    const winnerNames = dressingResult.winners.map((w) => w.candidateName);
    expect(winnerNames).toContain('Rahul Sharma');
    expect(winnerNames).toContain('John Doe');

    const speechResult = res.body.results.find((r) => r.categoryName === 'Best Speech');
    expect(speechResult.hasVotes).toBe(true);
    expect(speechResult.isJointWinner).toBe(false);
    expect(speechResult.winners).toHaveLength(1);
    expect(speechResult.winners[0].candidateName).toBe('Arun Kumar');
    expect(speechResult.winners[0].votes).toBe(3);

    const zeroResult = res.body.results.find((r) => r.categoryName === 'Best Innovation');
    expect(zeroResult.hasVotes).toBe(false);
    expect(zeroResult.message).toBe('No votes recorded.');
    expect(zeroResult.winners).toHaveLength(0);
  });

  it('allows public members to access final results via valid QR token once closed', async () => {
    const res = await request(app).get(`/api/results/public/${eventId}?token=${rawToken}`);
    expect(res.status).toBe(200);
    expect(res.body.results).toHaveLength(3);
  });
});


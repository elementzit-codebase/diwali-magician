import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../backend/src/app.js';
import { pool, query } from '../../backend/src/database/pool.js';

describe('Phase 9 Full Lifecycle End-to-End Simulation & Security Verification', () => {
  const app = createApp();

  let adminCookie;
  let eventId;
  let rawToken;
  let memberIds = [];
  let categoryDressingId, categorySpeechId;

  const MOBILE_USER_AGENTS = {
    iPhone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    Android: 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
  };

  beforeAll(async () => {
    // 1. Pristine database state
    await query('DELETE FROM ballot_choices');
    await query('DELETE FROM ballots');
    await query('DELETE FROM voter_participation');
    await query('DELETE FROM category_candidates');
    await query('DELETE FROM event_members');
    await query('DELETE FROM categories');
    await query('DELETE FROM events');
    await query('DELETE FROM members');
    await query('DELETE FROM admins WHERE email != 'admin@luxuryvoting.com'');
  });

  afterAll(async () => {
    // Return database to clean zero-seed state
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

  it('1. Step 1: Administrator initial setup & lock', async () => {
    const statusRes = await request(app).get('/api/auth/setup-status');
    expect(statusRes.body.setupRequired).toBe(true);

    const setupRes = await request(app)
      .post('/api/auth/setup')
      .send({
        fullName: 'Executive Host',
        email: 'host@luxurygala.com',
        password: 'GalaPassword2026!',
      });

    expect(setupRes.status).toBe(201);
    adminCookie = setupRes.headers['set-cookie'];
    expect(adminCookie).toBeDefined();

    // Verify setup is now locked permanently
    const imposterRes = await request(app)
      .post('/api/auth/setup')
      .send({
        fullName: 'Attacker',
        email: 'attacker@domain.com',
        password: 'Password123!',
      });
    expect(imposterRes.status).toBe(403);
  });

  it('2. Step 2: Member bulk import (~50 members)', async () => {
    let csvData = 'member_code,full_name\n';
    for (let i = 1; i <= 50; i++) {
      const code = `MEM-${String(i).padStart(3, '0')}`;
      csvData += `${code},Attendee ${i}\n`;
    }

    const importRes = await request(app)
      .post('/api/members/import-csv')
      .set('Cookie', adminCookie)
      .send({ csvContent: csvData });

    expect(importRes.status).toBe(200);
    expect(importRes.body.importedCount).toBe(50);

    const membersRes = await query('SELECT id, member_code FROM members ORDER BY member_code ASC');
    expect(membersRes.rowCount).toBe(50);
    memberIds = membersRes.rows.map((r) => r.id);
  });

  it('3. Step 3: Event creation, scheduling & QR token generation', async () => {
    const now = new Date();
    const eventRes = await request(app)
      .post('/api/events')
      .set('Cookie', adminCookie)
      .send({
        title: '50-Member Grand Evening',
        description: 'Annual prestigious awards ceremony',
        startAt: new Date(now.getTime() - 60000).toISOString(), // Started 1 min ago
        endAt: new Date(now.getTime() + 1000 * 60 * 60 * 3).toISOString(), // 3 hours window
        categories: ['Best Dressing', 'Best Speech'],
      });

    expect(eventRes.status).toBe(201);
    eventId = eventRes.body.event.id;
    rawToken = eventRes.body.event.rawAccessToken;
    expect(rawToken).toBeDefined();

    const cats = await query('SELECT id, name FROM categories WHERE event_id = $1', [eventId]);
    categoryDressingId = cats.rows.find((c) => c.name === 'Best Dressing').id;
    categorySpeechId = cats.rows.find((c) => c.name === 'Best Speech').id;

    // Enroll all 50 members as eligible voters and candidates
    const enrollRes = await request(app)
      .post(`/api/events/${eventId}/members`)
      .set('Cookie', adminCookie)
      .send({ memberIds, isEligible: true });

    expect(enrollRes.status).toBe(200);
    expect(enrollRes.body.enrolledCount).toBe(50);

    // Verify 50 members * 2 categories = 100 candidate entries
    const candidatesCount = await query(
      'SELECT count(*)::int AS count FROM category_candidates WHERE event_id = $1',
      [eventId]
    );
    expect(candidatesCount.rows[0].count).toBe(100);
  });

  it('4. Step 4: Mobile voter scans QR code and views event landing (iPhone emulation)', async () => {
    const landingRes = await request(app)
      .get(`/api/qr/access/${rawToken}`)
      .set('User-Agent', MOBILE_USER_AGENTS.iPhone);

    expect(landingRes.status).toBe(200);
    expect(landingRes.body.event.title).toBe('50-Member Grand Evening');
    expect(landingRes.body.event.votingAvailability).toBe('open');
  });

  it('5. Step 5: Mobile voter searches directory and selects name (Android emulation)', async () => {
    const searchRes = await request(app)
      .get(`/api/public/events/${eventId}/eligible-members?token=${rawToken}&search=MEM-001`)
      .set('User-Agent', MOBILE_USER_AGENTS.Android);

    expect(searchRes.status).toBe(200);
    expect(searchRes.body.members.length).toBeGreaterThanOrEqual(1);

    const voterMember = searchRes.body.members[0];
    expect(voterMember.member_code).toBe('MEM-001');

    // Create voter temporary session
    const sessionRes = await request(app)
      .post('/api/voting/session')
      .set('User-Agent', MOBILE_USER_AGENTS.Android)
      .send({
        eventId,
        memberId: voterMember.id,
        token: rawToken,
      });

    expect(sessionRes.status).toBe(200);
    const voterCookie = sessionRes.headers['set-cookie'];
    expect(voterCookie).toBeDefined();

    // Verify ballot context excludes Member 1 (Self-voting prevention)
    const contextRes = await request(app)
      .get('/api/voting/ballot-context')
      .set('Cookie', voterCookie);

    expect(contextRes.status).toBe(200);
    for (const cat of contextRes.body.categories) {
      const candidateIds = cat.candidates.map((c) => c.id);
      expect(candidateIds).not.toContain(voterMember.id); // Member 1 excluded!
      expect(cat.candidates.length).toBe(49); // 50 - 1 = 49 candidates
    }

    // Submit ballot choosing Member 2 for Dressing and Member 3 for Speech
    const submitRes = await request(app)
      .post('/api/voting/submit')
      .set('Cookie', voterCookie)
      .send({
        choices: [
          { categoryId: categoryDressingId, candidateMemberId: memberIds[1] }, // Attendee 002
          { categoryId: categorySpeechId, candidateMemberId: memberIds[2] },   // Attendee 003
        ],
      });

    expect(submitRes.status).toBe(200);
    expect(submitRes.body.message).toContain('Ballot successfully recorded');

    // Attempt double voting with Member 1
    const secondTry = await request(app)
      .post('/api/voting/session')
      .send({
        eventId,
        memberId: voterMember.id,
        token: rawToken,
      });
    expect(secondTry.status).toBe(409);
    expect(secondTry.body.code).toBe('ALREADY_VOTED');
  });

  it('6. Step 6: 20 attendees vote concurrently in high-concurrency simulation', async () => {
    // Simultaneously run voting workflow for 20 distinct members
    const votingPromises = memberIds.slice(1, 21).map(async (mId, idx) => {
      // 1. Establish session
      const sessRes = await request(app)
        .post('/api/voting/session')
        .send({ eventId, memberId: mId, token: rawToken });
      const cookie = sessRes.headers['set-cookie'];

      // 2. Select candidates (Vote for Member 10 for Dressing, Member 15 for Speech)
      // If mId is Member 10 or 15, choose alternative to avoid self-vote
      const dressingChoice = mId === memberIds[9] ? memberIds[0] : memberIds[9];
      const speechChoice = mId === memberIds[14] ? memberIds[0] : memberIds[14];

      // 3. Submit
      return request(app)
        .post('/api/voting/submit')
        .set('Cookie', cookie)
        .send({
          choices: [
            { categoryId: categoryDressingId, candidateMemberId: dressingChoice },
            { categoryId: categorySpeechId, candidateMemberId: speechChoice },
          ],
        });
    });

    const results = await Promise.all(votingPromises);
    for (const res of results) {
      expect(res.status).toBe(200);
    }

    // Total ballots cast: 1 (from previous test) + 20 = 21
    const totalBallots = await query(
      'SELECT count(*)::int AS count FROM ballots WHERE event_id = $1',
      [eventId]
    );
    expect(totalBallots.rows[0].count).toBe(21);
  });

  it('7. Step 7: Admin closes event and verifies accurate winner aggregation', async () => {
    // Results must be sealed prior to close
    const earlyCheck = await request(app)
      .get(`/api/results/admin/${eventId}`)
      .set('Cookie', adminCookie);
    expect(earlyCheck.status).toBe(403);

    // Close event
    await request(app)
      .post(`/api/events/${eventId}/close`)
      .set('Cookie', adminCookie);

    // Verify tally
    const resultsRes = await request(app)
      .get(`/api/results/admin/${eventId}`)
      .set('Cookie', adminCookie);

    expect(resultsRes.status).toBe(200);
    expect(resultsRes.body.statistics.ballotsCast).toBe(21);
    expect(resultsRes.body.statistics.totalEligible).toBe(50);
    expect(resultsRes.body.statistics.participationPercentage).toBe(42);

    // Check Best Dressing winner
    const dressing = resultsRes.body.results.find((r) => r.categoryName === 'Best Dressing');
    expect(dressing.hasVotes).toBe(true);
    expect(dressing.winners.length).toBeGreaterThanOrEqual(1);
    expect(dressing.winners[0].candidateId).toBe(memberIds[9]); // Attendee 10 won!
  });
});

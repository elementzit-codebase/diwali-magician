import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { pool, query } from '../../backend/src/database/pool.js';

describe('Phase 2 Database Schema & Constraint Validation', () => {
  beforeAll(async () => {
    // Verify connection to clean DB
    const res = await query('SELECT current_database(), NOW()');
    expect(res.rows[0].current_database).toBe('voting_app');
  });

  afterAll(async () => {
    await pool.end();
  });

  it('verifies all 9 application tables exist in public schema', async () => {
    const res = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name != 'schema_migrations'
      ORDER BY table_name;
    `);

    const tableNames = res.rows.map((r) => r.table_name);
    const expected = [
      'admins',
      'ballot_choices',
      'ballots',
      'categories',
      'category_candidates',
      'event_members',
      'events',
      'members',
      'voter_participation',
    ];

    expect(tableNames.sort()).toEqual(expected.sort());
  });

  it('guarantees zero seed data across all application tables', async () => {
    const tables = [
      'admins',
      'members',
      'events',
      'event_members',
      'categories',
      'category_candidates',
      'voter_participation',
      'ballots',
      'ballot_choices',
    ];

    for (const table of tables) {
      const res = await query(`SELECT count(*) FROM "${table}"`);
      expect(parseInt(res.rows[0].count, 10)).toBe(0);
    }
  });

  it('guarantees members table has no password, PIN, or OTP credential columns', async () => {
    const res = await query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'members'
    `);
    const colNames = res.rows.map((r) => r.column_name);
    expect(colNames).not.toContain('password');
    expect(colNames).not.toContain('password_hash');
    expect(colNames).not.toContain('pin');
    expect(colNames).not.toContain('otp');
    expect(colNames).toContain('member_code');
    expect(colNames).toContain('full_name');
    expect(colNames).toContain('is_active');
  });

  it('guarantees ballots table does not contain voter_member_id (Confidential Ballot Design)', async () => {
    const res = await query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'ballots'
    `);
    const colNames = res.rows.map((r) => r.column_name);
    expect(colNames).not.toContain('member_id');
    expect(colNames).not.toContain('voter_member_id');
    expect(colNames).toContain('id');
    expect(colNames).toContain('event_id');
    expect(colNames).toContain('submitted_at');
  });

  it('enforces UNIQUE(event_id, member_id) on voter_participation via transaction rollback', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Create temporary fixtures in isolated transaction
      const adminRes = await client.query(`
        INSERT INTO admins (full_name, email, password_hash)
        VALUES ('Test Admin', 'fixture_test@domain.com', 'hashed_pass')
        RETURNING id;
      `);
      const adminId = adminRes.rows[0].id;

      const eventRes = await client.query(`
        INSERT INTO events (title, start_at, end_at, status, access_token_hash, created_by)
        VALUES (
          'Test', 
          CURRENT_TIMESTAMP, 
          CURRENT_TIMESTAMP + INTERVAL '2 hours', 
          'active', 
          'hash_abc123', 
          $1
        )
        RETURNING id;
      `, [adminId]);
      const eventId = eventRes.rows[0].id;

      const memberRes = await client.query(`
        INSERT INTO members (member_code, full_name)
        VALUES ('T-001', 'Test Member 1')
        RETURNING id;
      `);
      const memberId = memberRes.rows[0].id;

      // First participation record succeeds
      await client.query(`
        INSERT INTO voter_participation (event_id, member_id)
        VALUES ($1, $2);
      `, [eventId, memberId]);

      // Second duplicate participation record MUST fail with unique constraint violation (23505)
      let duplicateError;
      try {
        await client.query(`
          INSERT INTO voter_participation (event_id, member_id)
          VALUES ($1, $2);
        `, [eventId, memberId]);
      } catch (err) {
        duplicateError = err;
      }

      expect(duplicateError).toBeDefined();
      expect(duplicateError.code).toBe('23505'); // PostgreSQL unique_violation code

      // Rollback completely to leave table pristine and empty
      await client.query('ROLLBACK');
    } finally {
      client.release();
    }

    // Verify table remains empty after rollback
    const afterCount = await query(`SELECT count(*) FROM voter_participation`);
    expect(parseInt(afterCount.rows[0].count, 10)).toBe(0);
  });
});


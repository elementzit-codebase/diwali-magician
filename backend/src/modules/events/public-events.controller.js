import { Router } from 'express';
import { query } from '../../database/pool.js';
import { hashToken } from '../../utils/crypto.js';
import { apiLimiter } from '../../middleware/rateLimiter.js';
import { AppError } from '../../middleware/errorHandler.js';

const router = Router();

// Public: Get eligible members list for an event via valid QR token
// Used by Step 2: Member Name Selection autocomplete on mobile
router.get('/:eventId/eligible-members', apiLimiter, async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const { token, search } = req.query;

    if (!token) {
      throw new AppError('QR access token required to view event members', 401, 'TOKEN_REQUIRED');
    }

    // Verify token matches event
    const tokenHash = hashToken(token);
    const eventCheck = await query(
      `SELECT id, status FROM events WHERE id = $1 AND access_token_hash = $2`,
      [eventId, tokenHash]
    );

    if (eventCheck.rowCount === 0) {
      throw new AppError('Invalid or unauthorized event token', 403, 'UNAUTHORIZED_ACCESS');
    }

    // Fetch registered, eligible members who haven't already voted
    let sql = `
      SELECT m.id, m.member_code, m.full_name,
             CASE WHEN vp.id IS NOT NULL THEN TRUE ELSE FALSE END AS has_voted
      FROM event_members em
      JOIN members m ON em.member_id = m.id
      LEFT JOIN voter_participation vp ON vp.event_id = em.event_id AND vp.member_id = m.id
      WHERE em.event_id = $1 AND em.is_eligible = TRUE AND m.is_active = TRUE
    `;
    const params = [eventId];

    if (search) {
      params.push(`%${search}%`);
      sql += ` AND (m.full_name ILIKE $${params.length} OR m.member_code ILIKE $${params.length})`;
    }

    sql += ` ORDER BY m.full_name ASC`;

    const membersRes = await query(sql, params);

    res.json({
      members: membersRes.rows,
    });
  } catch (err) {
    next(err);
  }
});

export default router;


import { query, getClient } from '../../database/pool.js';
import { hashToken, generateSecureToken } from '../../utils/crypto.js';
import { AppError } from '../../middleware/errorHandler.js';

export async function listEvents() {
  const res = await query(`
    SELECT 
      e.id, 
      e.title, 
      e.description, 
      e.start_at, 
      e.end_at, 
      e.duration_minutes,
      e.status,
      e.raw_access_token,
      e.created_at,
      e.updated_at,
      COUNT(DISTINCT em.member_id)::int AS total_members,
      COUNT(DISTINCT vp.member_id)::int AS submitted_ballots
    FROM events e
    LEFT JOIN event_members em ON e.id = em.event_id AND em.is_eligible = TRUE
    LEFT JOIN voter_participation vp ON e.id = vp.event_id
    GROUP BY e.id
    ORDER BY e.created_at DESC
  `);
  return res.rows;
}

export async function getEventById(id) {
  const res = await query(
    `SELECT e.id, e.title, e.description, e.start_at, e.end_at, e.duration_minutes, e.status, e.created_at, e.updated_at,
            e.access_token_hash, e.raw_access_token,
            COUNT(DISTINCT em.member_id)::int AS total_members,
            COUNT(DISTINCT vp.member_id)::int AS submitted_ballots
     FROM events e
     LEFT JOIN event_members em ON e.id = em.event_id AND em.is_eligible = TRUE
     LEFT JOIN voter_participation vp ON e.id = vp.event_id
     WHERE e.id = $1
     GROUP BY e.id`,
    [id]
  );
  if (res.rowCount === 0) return null;

  const event = res.rows[0];

  // Fetch categories
  const catRes = await query(
    `SELECT id, name, created_at FROM categories WHERE event_id = $1 ORDER BY created_at ASC`,
    [id]
  );
  event.categories = catRes.rows;

  return event;
}

export async function createEvent({ title, description, durationMinutes = 5, startAt, endAt, categories = ['Diwali Style Icon', 'Sparkling Speaker'], adminId }) {
  const rawToken = generateSecureToken(32);
  const tokenHash = hashToken(rawToken);

  const client = await getClient();
  try {
    await client.query('BEGIN');

    const now = new Date();
    const mins = parseInt(durationMinutes, 10) || 5;

    // Default status is draft (waiting for admin to click Start)
    let initialStatus = 'draft';
    let finalStart = startAt ? new Date(startAt) : now;
    let finalEnd = endAt ? new Date(endAt) : new Date(finalStart.getTime() + mins * 60 * 1000);

    if (startAt && endAt) {
      const s = new Date(startAt);
      const e = new Date(endAt);
      if (now >= s && now < e) {
        initialStatus = 'active';
      } else if (now >= e) {
        initialStatus = 'closed';
      } else {
        initialStatus = 'scheduled';
      }
    }

    if (finalEnd <= finalStart) {
      finalEnd = new Date(finalStart.getTime() + mins * 60 * 1000);
    }

    const eventRes = await client.query(
      `INSERT INTO events (title, description, start_at, end_at, duration_minutes, status, access_token_hash, raw_access_token, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, title, description, start_at, end_at, duration_minutes, status, raw_access_token, created_at`,
      [title, description || null, finalStart.toISOString(), finalEnd.toISOString(), mins, initialStatus, tokenHash, rawToken, adminId]
    );
    const event = eventRes.rows[0];

    // Create initial categories dynamically
    const createdCategories = [];
    for (const catName of categories) {
      const catRes = await client.query(
        `INSERT INTO categories (event_id, name)
         VALUES ($1, $2)
         RETURNING id, name`,
        [event.id, catName]
      );
      createdCategories.push(catRes.rows[0]);
    }

    await client.query('COMMIT');
    return {
      ...event,
      categories: createdCategories,
      rawAccessToken: rawToken,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function startVotingNow(id, durationMinutes) {
  const existing = await getEventById(id);
  if (!existing) {
    throw new AppError('Event not found', 404, 'EVENT_NOT_FOUND');
  }

  const mins = durationMinutes || existing.duration_minutes || 5;
  const now = new Date();
  const end = new Date(now.getTime() + mins * 60 * 1000);

  const res = await query(
    `UPDATE events
     SET status = 'active', start_at = $1, end_at = $2, duration_minutes = $3, updated_at = CURRENT_TIMESTAMP
     WHERE id = $4
     RETURNING id, title, description, start_at, end_at, duration_minutes, status, updated_at`,
    [now.toISOString(), end.toISOString(), mins, id]
  );

  return res.rows[0];
}

export async function updateEvent(id, { title, description, startAt, endAt, status }) {
  const existing = await getEventById(id);
  if (!existing) {
    throw new AppError('Event not found', 404, 'EVENT_NOT_FOUND');
  }

  const newTitle = title !== undefined ? title : existing.title;
  const newDesc = description !== undefined ? description : existing.description;
  const newStart = startAt !== undefined ? startAt : existing.start_at;
  const newEnd = endAt !== undefined ? endAt : existing.end_at;
  const newStatus = status !== undefined ? status : existing.status;

  if (new Date(newEnd) <= new Date(newStart)) {
    throw new AppError('End time must be after start time', 400, 'INVALID_SCHEDULE');
  }

  const res = await query(
    `UPDATE events
     SET title = $1, description = $2, start_at = $3, end_at = $4, status = $5, updated_at = CURRENT_TIMESTAMP
     WHERE id = $6
     RETURNING id, title, description, start_at, end_at, status, updated_at`,
    [newTitle, newDesc, newStart, newEnd, newStatus, id]
  );

  return res.rows[0];
}

export async function closeVotingEarly(id) {
  const res = await query(
    `UPDATE events
     SET status = 'closed', end_at = LEAST(end_at, CURRENT_TIMESTAMP), updated_at = CURRENT_TIMESTAMP
     WHERE id = $1
     RETURNING id, title, status, end_at`,
    [id]
  );
  if (res.rowCount === 0) {
    throw new AppError('Event not found', 404, 'EVENT_NOT_FOUND');
  }
  return res.rows[0];
}

export async function registerEventMembers(eventId, memberIds, isEligible = true) {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    // 1. Fetch categories for this event
    const categories = await client.query(
      `SELECT id FROM categories WHERE event_id = $1`,
      [eventId]
    );

    let enrolledCount = 0;
    for (const memberId of memberIds) {
      // Upsert into event_members
      await client.query(
        `INSERT INTO event_members (event_id, member_id, is_eligible)
         VALUES ($1, $2, $3)
         ON CONFLICT (event_id, member_id) 
         DO UPDATE SET is_eligible = EXCLUDED.is_eligible`,
        [eventId, memberId, isEligible]
      );

      // Requirement 2.3 #6: "All eligible event members are candidates."
      // Bind to all categories for this event
      if (isEligible) {
        for (const cat of categories.rows) {
          await client.query(
            `INSERT INTO category_candidates (event_id, category_id, member_id)
             VALUES ($1, $2, $3)
             ON CONFLICT (category_id, member_id) DO NOTHING`,
            [eventId, cat.id, memberId]
          );
        }
      }
      enrolledCount++;
    }

    await client.query('COMMIT');
    return { enrolledCount };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function getEventMembers(eventId) {
  const res = await query(
    `SELECT m.id, m.member_code, m.full_name, em.is_eligible, em.added_at,
            CASE WHEN vp.id IS NOT NULL THEN TRUE ELSE FALSE END AS has_voted
     FROM event_members em
     JOIN members m ON em.member_id = m.id
     LEFT JOIN voter_participation vp ON vp.event_id = em.event_id AND vp.member_id = m.id
     WHERE em.event_id = $1
     ORDER BY m.full_name ASC`,
    [eventId]
  );
  return res.rows;
}

export async function addCategory(eventId, name) {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const catRes = await client.query(
      `INSERT INTO categories (event_id, name)
       VALUES ($1, $2)
       RETURNING id, event_id, name, created_at`,
      [eventId, name]
    );
    const category = catRes.rows[0];

    // Automatically enroll all currently eligible event members as candidates
    await client.query(
      `INSERT INTO category_candidates (event_id, category_id, member_id)
       SELECT event_id, $1, member_id
       FROM event_members
       WHERE event_id = $2 AND is_eligible = TRUE
       ON CONFLICT DO NOTHING`,
      [category.id, eventId]
    );

    await client.query('COMMIT');
    return category;
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23505') {
      throw new AppError(`Category '${name}' already exists for this event`, 409, 'DUPLICATE_CATEGORY');
    }
    throw err;
  } finally {
    client.release();
  }
}

export async function deleteEvent(id) {
  const res = await query(`DELETE FROM events WHERE id = $1 RETURNING id, title`, [id]);
  if (res.rowCount === 0) {
    throw new AppError('Event not found', 404, 'EVENT_NOT_FOUND');
  }
  return res.rows[0];
}



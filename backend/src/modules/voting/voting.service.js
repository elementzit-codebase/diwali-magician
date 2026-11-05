import { query, getClient } from '../../database/pool.js';
import { hashToken } from '../../utils/crypto.js';
import { AppError } from '../../middleware/errorHandler.js';

export async function createVotingSession({ eventId, memberId, rawToken }) {
  // 1. Verify Event & QR Token
  const tokenHash = hashToken(rawToken);
  const eventRes = await query(
    `SELECT id, title, start_at, end_at, status
     FROM events
     WHERE id = $1 AND access_token_hash = $2`,
    [eventId, tokenHash]
  );

  if (eventRes.rowCount === 0) {
    throw new AppError('Invalid event QR code or access token', 403, 'INVALID_EVENT_ACCESS');
  }

  const event = eventRes.rows[0];
  const now = new Date();

  // Schedule validation using server time
  if (now < new Date(event.start_at)) {
    throw new AppError('Voting for this event has not started yet', 400, 'VOTING_NOT_STARTED');
  }

  if (now >= new Date(event.end_at) || event.status === 'closed') {
    throw new AppError('Voting for this event has closed', 400, 'VOTING_CLOSED');
  }

  // 2. Verify Member exists & is active
  const memberRes = await query(
    `SELECT id, member_code, full_name, is_active
     FROM members
     WHERE id = $1`,
    [memberId]
  );

  if (memberRes.rowCount === 0 || !memberRes.rows[0].is_active) {
    throw new AppError('Selected member is not eligible or active', 400, 'INELIGIBLE_MEMBER');
  }
  const member = memberRes.rows[0];

  // 3. Verify Member is registered and eligible for this specific event
  const eligibilityRes = await query(
    `SELECT is_eligible
     FROM event_members
     WHERE event_id = $1 AND member_id = $2`,
    [eventId, memberId]
  );

  if (eligibilityRes.rowCount === 0 || !eligibilityRes.rows[0].is_eligible) {
    throw new AppError('Member is not registered or eligible for this event', 403, 'NOT_REGISTERED_FOR_EVENT');
  }

  // 4. Verify Member has not already participated
  const participationRes = await query(
    `SELECT id, submitted_at
     FROM voter_participation
     WHERE event_id = $1 AND member_id = $2`,
    [eventId, memberId]
  );

  if (participationRes.rowCount > 0) {
    throw new AppError('You have already submitted your ballot for this event.', 409, 'ALREADY_VOTED');
  }

  return {
    eventId: event.id,
    eventTitle: event.title,
    memberId: member.id,
    memberCode: member.member_code,
    memberName: member.full_name,
  };
}

export async function getBallotContext({ eventId, memberId }) {
  // 1. Fetch Categories for the event
  const categoriesRes = await query(
    `SELECT id, name
     FROM categories
     WHERE event_id = $1
     ORDER BY created_at ASC`,
    [eventId]
  );

  if (categoriesRes.rowCount === 0) {
    throw new AppError('No voting categories found for this event', 400, 'NO_CATEGORIES');
  }

  const categories = categoriesRes.rows;

  // 2. Fetch Candidates for each category
  // ENFORCE RULE 2.3 #5: A member cannot select themselves in either category!
  // Exclude current session memberId from candidates list
  const candidatesRes = await query(
    `SELECT cc.category_id, m.id AS candidate_id, m.member_code, m.full_name
     FROM category_candidates cc
     JOIN members m ON cc.member_id = m.id
     JOIN event_members em ON em.event_id = cc.event_id AND em.member_id = m.id
     WHERE cc.event_id = $1 
       AND cc.member_id != $2
       AND em.is_eligible = TRUE 
       AND m.is_active = TRUE
     ORDER BY m.full_name ASC`,
    [eventId, memberId]
  );

  const candidatesByCategory = {};
  for (const cat of categories) {
    candidatesByCategory[cat.id] = [];
  }

  for (const candidate of candidatesRes.rows) {
    if (candidatesByCategory[candidate.category_id]) {
      candidatesByCategory[candidate.category_id].push({
        id: candidate.candidate_id,
        memberCode: candidate.member_code,
        fullName: candidate.full_name,
      });
    }
  }

  return {
    categories: categories.map((c) => ({
      id: c.id,
      name: c.name,
      candidates: candidatesByCategory[c.id] || [],
    })),
  };
}

export async function submitBallot({ eventId, memberId, choices }) {
  const client = await getClient();

  try {
    await client.query('BEGIN');

    // Step 1: Re-validate trusted server/database schedule inside the transaction
    const eventRes = await client.query(
      `SELECT id, status, start_at, end_at
       FROM events
       WHERE id = $1
       FOR SHARE`,
      [eventId]
    );

    if (eventRes.rowCount === 0) {
      throw new AppError('Event not found', 404, 'EVENT_NOT_FOUND');
    }

    const event = eventRes.rows[0];
    const now = new Date();

    if (now >= new Date(event.end_at) || event.status === 'closed') {
      throw new AppError('Voting deadline has passed. Submissions are closed.', 400, 'VOTING_CLOSED');
    }
    if (now < new Date(event.start_at)) {
      throw new AppError('Voting has not commenced.', 400, 'VOTING_NOT_STARTED');
    }

    // Step 2: Validate category completeness (Rule 2.3 #3 & #8)
    const requiredCategoriesRes = await client.query(
      `SELECT id, name FROM categories WHERE event_id = $1`,
      [eventId]
    );
    const requiredCategories = requiredCategoriesRes.rows;
    const requiredCatIds = new Set(requiredCategories.map((c) => c.id));

    if (choices.length !== requiredCatIds.size) {
      throw new AppError(
        `Incomplete ballot. You must make a selection for all ${requiredCatIds.size} categories.`,
        400,
        'INCOMPLETE_BALLOT'
      );
    }

    const submittedCatIds = new Set();
    for (const choice of choices) {
      if (!requiredCatIds.has(choice.categoryId)) {
        throw new AppError('Selection contains an invalid category for this event', 400, 'INVALID_CATEGORY');
      }
      if (submittedCatIds.has(choice.categoryId)) {
        throw new AppError('Multiple selections submitted for the same category', 400, 'DUPLICATE_CATEGORY_SELECTION');
      }
      submittedCatIds.add(choice.categoryId);

      // ENFORCE RULE 2.3 #5: A member cannot select themselves in either category
      if (choice.candidateMemberId === memberId) {
        throw new AppError('Self-voting is strictly prohibited.', 403, 'SELF_VOTING_PROHIBITED');
      }
    }

    // Step 3: Record voter participation
    // The UNIQUE(event_id, member_id) constraint in PostgreSQL protects against concurrent double-submits
    try {
      await client.query(
        `INSERT INTO voter_participation (event_id, member_id)
         VALUES ($1, $2)`,
        [eventId, memberId]
      );
    } catch (err) {
      if (err.code === '23505') {
        throw new AppError('You have already submitted a ballot for this event.', 409, 'ALREADY_VOTED');
      }
      throw err;
    }

    // Step 4: Insert confidential ballot (does NOT link to memberId)
    const ballotRes = await client.query(
      `INSERT INTO ballots (event_id)
       VALUES ($1)
       RETURNING id, submitted_at`,
      [eventId]
    );
    const ballotId = ballotRes.rows[0].id;

    // Step 5: Insert choices
    for (const choice of choices) {
      // Validate candidate is enrolled in this category
      const candidateCheck = await client.query(
        `SELECT 1 FROM category_candidates 
         WHERE category_id = $1 AND member_id = $2`,
        [choice.categoryId, choice.candidateMemberId]
      );

      if (candidateCheck.rowCount === 0) {
        throw new AppError('Selected candidate is not eligible for this category', 400, 'INVALID_CANDIDATE');
      }

      await client.query(
        `INSERT INTO ballot_choices (ballot_id, event_id, category_id, candidate_member_id)
         VALUES ($1, $2, $3, $4)`,
        [ballotId, eventId, choice.categoryId, choice.candidateMemberId]
      );
    }

    await client.query('COMMIT');
    return {
      success: true,
      submittedAt: ballotRes.rows[0].submitted_at,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}


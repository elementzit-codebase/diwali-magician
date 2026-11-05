import { query } from '../../database/pool.js';
import { hashToken } from '../../utils/crypto.js';
import { AppError } from '../../middleware/errorHandler.js';

export async function getEventResults(eventId, { isAdmin = false, rawToken = null } = {}) {
  // 1. Fetch Event Status and Schedule
  let eventQuery = `SELECT id, title, description, start_at, end_at, status, access_token_hash FROM events WHERE id = $1`;
  const eventRes = await query(eventQuery, [eventId]);

  if (eventRes.rowCount === 0) {
    throw new AppError('Event not found', 404, 'EVENT_NOT_FOUND');
  }

  const event = eventRes.rows[0];

  // If public member request, validate QR access token
  if (!isAdmin) {
    if (!rawToken) {
      throw new AppError('QR access token required to view results', 401, 'TOKEN_REQUIRED');
    }
    const tokenHash = hashToken(rawToken);
    if (event.access_token_hash !== tokenHash) {
      throw new AppError('Invalid or unauthorized event token', 403, 'UNAUTHORIZED');
    }
  }

  // 2. Enforce Results Secrecy (Requirement 6 & 11)
  // Results must remain sealed while voting is active!
  const now = new Date();
  const isClosed = event.status === 'closed' || now >= new Date(event.end_at);

  if (!isClosed) {
    throw new AppError(
      'Results are sealed. Voting is currently in progress and results will be available after voting concludes.',
      403,
      'RESULTS_SEALED'
    );
  }

  // 3. Participation Statistics
  const statsRes = await query(
    `SELECT 
       COUNT(DISTINCT em.member_id)::int AS total_eligible,
       COUNT(DISTINCT vp.member_id)::int AS ballots_cast
     FROM event_members em
     LEFT JOIN voter_participation vp ON em.event_id = vp.event_id
     WHERE em.event_id = $1 AND em.is_eligible = TRUE`,
    [eventId]
  );

  const totalEligible = statsRes.rows[0]?.total_eligible || 0;
  const ballotsCast = statsRes.rows[0]?.ballots_cast || 0;
  const participationPercentage =
    totalEligible > 0 ? Math.round((ballotsCast / totalEligible) * 100) : 0;

  // 4. Fetch Categories for the Event
  const categoriesRes = await query(
    `SELECT id, name FROM categories WHERE event_id = $1 ORDER BY created_at ASC`,
    [eventId]
  );
  const categories = categoriesRes.rows;

  // 5. Aggregate Votes per Category with DENSE_RANK for Joint Winners
  const voteTalliesRes = await query(
    `WITH candidate_votes AS (
       SELECT 
         bc.category_id,
         bc.candidate_member_id,
         m.full_name AS candidate_name,
         m.member_code,
         COUNT(bc.id)::int AS total_votes
       FROM ballot_choices bc
       JOIN members m ON bc.candidate_member_id = m.id
       WHERE bc.event_id = $1
       GROUP BY bc.category_id, bc.candidate_member_id, m.full_name, m.member_code
     ),
     ranked_votes AS (
       SELECT 
         cv.*,
         DENSE_RANK() OVER (PARTITION BY cv.category_id ORDER BY cv.total_votes DESC)::int as rank
       FROM candidate_votes cv
     )
     SELECT * FROM ranked_votes ORDER BY category_id, rank ASC, candidate_name ASC`,
    [eventId]
  );

  const votesByCategory = {};
  for (const cat of categories) {
    votesByCategory[cat.id] = [];
  }

  for (const row of voteTalliesRes.rows) {
    if (votesByCategory[row.category_id]) {
      votesByCategory[row.category_id].push(row);
    }
  }

  // 6. Build Category Results with Joint Winner and Zero-Vote Handling
  const results = categories.map((cat) => {
    const tallies = votesByCategory[cat.id] || [];
    const totalCategoryVotes = tallies.reduce((sum, t) => sum + t.total_votes, 0);

    if (tallies.length === 0 || totalCategoryVotes === 0) {
      return {
        categoryId: cat.id,
        categoryName: cat.name,
        hasVotes: false,
        message: 'No votes recorded.',
        winners: [],
        tallies: [],
      };
    }

    // Top rank winners (rank = 1)
    const rank1 = tallies.filter((t) => t.rank === 1);
    const isTie = rank1.length > 1;

    const winners = rank1.map((w) => ({
      candidateId: w.candidate_member_id,
      candidateName: w.candidate_name,
      memberCode: w.member_code,
      votes: w.total_votes,
      isJointWinner: isTie,
    }));

    return {
      categoryId: cat.id,
      categoryName: cat.name,
      hasVotes: true,
      totalVotes: totalCategoryVotes,
      isJointWinner: isTie,
      winners,
      tallies: tallies.map((t) => ({
        candidateId: t.candidate_member_id,
        candidateName: t.candidate_name,
        memberCode: t.member_code,
        votes: t.total_votes,
        rank: t.rank,
      })),
    };
  });

  return {
    event: {
      id: event.id,
      title: event.title,
      description: event.description,
      status: event.status,
      startAt: event.start_at,
      endAt: event.end_at,
    },
    statistics: {
      totalEligible,
      ballotsCast,
      participationPercentage,
    },
    results,
  };
}

import { Router } from 'express';
import {
  createVotingSession,
  getBallotContext,
  submitBallot,
} from './voting.service.js';
import {
  createVoterSessionCookie,
  clearVoterSessionCookie,
  requireVoterSession,
} from '../../middleware/voterSession.js';
import { validate } from '../../middleware/validate.js';
import { apiLimiter } from '../../middleware/rateLimiter.js';
import { createVotingSessionSchema, submitBallotSchema } from './voting.schema.js';

const router = Router();

// Apply general API rate limiting to voting endpoints
router.use(apiLimiter);

// 1. Establish temporary server-side voter session (Step 4)
router.post('/session', validate(createVotingSessionSchema), async (req, res, next) => {
  try {
    const { eventId, memberId, token } = req.body;
    const sessionData = await createVotingSession({
      eventId,
      memberId,
      rawToken: token,
    });

    // Set signed, HTTP-only session cookie
    createVoterSessionCookie(res, {
      eventId: sessionData.eventId,
      memberId: sessionData.memberId,
      memberName: sessionData.memberName,
    });

    res.status(200).json({
      message: 'Voting session initialized successfully.',
      session: {
        eventId: sessionData.eventId,
        eventTitle: sessionData.eventTitle,
        memberId: sessionData.memberId,
        memberCode: sessionData.memberCode,
        memberName: sessionData.memberName,
      },
    });
  } catch (err) {
    next(err);
  }
});

// 2. Fetch ballot categories and candidates (Step 5)
// Candidates list automatically excludes the voter themselves (Rule 2.3 #5)
router.get('/ballot-context', requireVoterSession, async (req, res, next) => {
  try {
    const { eventId, memberId, memberName } = req.voterSession;
    const ballotContext = await getBallotContext({ eventId, memberId });

    res.json({
      member: {
        id: memberId,
        name: memberName,
      },
      ...ballotContext,
    });
  } catch (err) {
    next(err);
  }
});

// 3. Submit complete ballot (Step 7)
// Strictly reads voter memberId and eventId from the secure server session cookie, NOT the body
router.post('/submit', requireVoterSession, validate(submitBallotSchema), async (req, res, next) => {
  try {
    const { eventId, memberId } = req.voterSession;
    const { choices } = req.body;

    const result = await submitBallot({
      eventId,
      memberId,
      choices,
    });

    // Clear temporary voting session cookie upon successful submission
    clearVoterSessionCookie(res);

    res.status(200).json({
      message: 'Ballot successfully recorded. Thank you for voting!',
      submittedAt: result.submittedAt,
    });
  } catch (err) {
    next(err);
  }
});

// 4. Clear/Abandon voting session
router.post('/abandon', (req, res) => {
  clearVoterSessionCookie(res);
  res.json({ message: 'Voting session terminated.' });
});

export default router;


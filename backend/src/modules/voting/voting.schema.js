import { z } from 'zod';

export const createVotingSessionSchema = z.object({
  body: z.object({
    eventId: z.string().uuid('Invalid event ID format'),
    memberId: z.string().uuid('Invalid member ID format'),
    token: z.string({ required_error: 'QR access token is required' }).min(10),
  }),
});

export const submitBallotSchema = z.object({
  body: z.object({
    choices: z
      .array(
        z.object({
          categoryId: z.string().uuid('Invalid category ID format'),
          candidateMemberId: z.string().uuid('Invalid candidate ID format'),
        })
      )
      .min(1, 'Ballot must contain at least one selection'),
  }),
});


import { z } from 'zod';

export const createEventSchema = z.object({
  body: z.object({
    title: z
      .string({ required_error: 'Event title is required' })
      .trim()
      .min(2, 'Title must be at least 2 characters')
      .max(200, 'Title is too long'),
    description: z.string().trim().optional(),
    durationMinutes: z.coerce.number().int().min(1, 'Duration must be at least 1 minute').max(1440).default(5),
    startAt: z.string().datetime().optional(),
    endAt: z.string().datetime().optional(),
    categories: z
      .array(z.string().trim().min(2))
      .optional()
      .default(['Best Dressing', 'Best Speech']),
  }),
});

export const updateEventSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid event ID format'),
  }),
  body: z.object({
    title: z.string().trim().min(2).max(200).optional(),
    description: z.string().trim().optional(),
    durationMinutes: z.coerce.number().int().min(1).max(1440).optional(),
    startAt: z.string().datetime().optional(),
    endAt: z.string().datetime().optional(),
    status: z.enum(['draft', 'scheduled', 'active', 'closed']).optional(),
  }),
});

export const eventIdParamSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid event ID format'),
  }),
});

export const registerEventMembersSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid event ID format'),
  }),
  body: z.object({
    memberIds: z.array(z.string().uuid()).min(1, 'Provide at least one member ID'),
    isEligible: z.boolean().optional().default(true),
  }),
});

export const addCategorySchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid event ID format'),
  }),
  body: z.object({
    name: z.string({ required_error: 'Category name is required' }).trim().min(2).max(100),
  }),
});


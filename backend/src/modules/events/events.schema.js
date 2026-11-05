import { z } from 'zod';

export const createEventSchema = z.object({
  body: z.object({
    title: z
      .string({ required_error: 'Event title is required' })
      .trim()
      .min(3, 'Title must be at least 3 characters')
      .max(200, 'Title is too long'),
    description: z.string().trim().optional(),
    startAt: z.string({ required_error: 'Start time is required' }).datetime(),
    endAt: z.string({ required_error: 'End time is required' }).datetime(),
    categories: z
      .array(z.string().trim().min(2))
      .optional()
      .default(['Best Dressing', 'Best Speech']),
  }).refine((data) => new Date(data.endAt) > new Date(data.startAt), {
    message: 'End time must be after start time',
    path: ['endAt'],
  }),
});

export const updateEventSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid event ID format'),
  }),
  body: z.object({
    title: z.string().trim().min(3).max(200).optional(),
    description: z.string().trim().optional(),
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


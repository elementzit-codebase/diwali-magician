import { z } from 'zod';

export const createMemberSchema = z.object({
  body: z.object({
    memberCode: z
      .string({ required_error: 'Member code is required' })
      .trim()
      .min(1, 'Member code cannot be empty')
      .max(50, 'Member code is too long'),
    fullName: z
      .string({ required_error: 'Full name is required' })
      .trim()
      .min(2, 'Full name must be at least 2 characters')
      .max(150, 'Full name is too long'),
    isActive: z.boolean().optional().default(true),
  }),
});

export const updateMemberSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid member ID format'),
  }),
  body: z.object({
    memberCode: z
      .string()
      .trim()
      .min(1, 'Member code cannot be empty')
      .max(50, 'Member code is too long')
      .optional(),
    fullName: z
      .string()
      .trim()
      .min(2, 'Full name must be at least 2 characters')
      .max(150, 'Full name is too long')
      .optional(),
    isActive: z.boolean().optional(),
  }),
});

export const memberIdParamSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid member ID format'),
  }),
});

export const csvImportSchema = z.object({
  body: z.object({
    csvContent: z.string({ required_error: 'CSV content is required' }).min(1),
  }),
});


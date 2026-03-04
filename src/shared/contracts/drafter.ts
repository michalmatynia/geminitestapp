import { z } from 'zod';

import { dtoBaseSchema } from './base';

/**
 * Drafter Contracts
 */

export const draftSchema = dtoBaseSchema.extend({
  title: z.string(),
  content: z.record(z.string(), z.unknown()),
  type: z.string(),
  status: z.enum(['draft', 'published', 'archived']),
  authorId: z.string(),
  publishedAt: z.string().nullable(),
});

export type Draft = z.infer<typeof draftSchema>;

export const createDraftSchema = draftSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateDraftInput = z.infer<typeof createDraftSchema>;
export type UpdateDraftInput = Partial<CreateDraftInput>;

export const publishDraftSchema = z.object({
  id: z.string(),
  publishedAt: z.string().optional(),
});

export type PublishDraftInput = z.infer<typeof publishDraftSchema>;

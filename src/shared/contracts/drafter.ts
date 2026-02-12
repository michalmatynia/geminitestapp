import { z } from 'zod';

import { dtoBaseSchema } from './base';

/**
 * Drafter DTOs
 */

export const draftSchema = dtoBaseSchema.extend({
  title: z.string(),
  content: z.record(z.string(), z.unknown()),
  type: z.string(),
  status: z.enum(['draft', 'published', 'archived']),
  authorId: z.string(),
  publishedAt: z.string().nullable(),
});

export type DraftDto = z.infer<typeof draftSchema>;

export const createDraftSchema = draftSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateDraftDto = z.infer<typeof createDraftSchema>;
export type UpdateDraftDto = Partial<CreateDraftDto>;

export const publishDraftSchema = z.object({
  id: z.string(),
  publishedAt: z.string().optional(),
});

export type PublishDraftDto = z.infer<typeof publishDraftSchema>;

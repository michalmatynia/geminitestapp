import { z } from 'zod';

import { namedDtoSchema } from './base';

/**
 * App Embed Contract
 */
export const appEmbedTypeSchema = z.enum(['iframe', 'widget', 'script']);
export type AppEmbedTypeDto = z.infer<typeof appEmbedTypeSchema>;

export const appEmbedIdSchema = z.enum(['chatbot', 'ai-paths', 'notes', 'products']);
export type AppEmbedIdDto = z.infer<typeof appEmbedIdSchema>;

export const appEmbedSchema = namedDtoSchema.extend({
  type: appEmbedTypeSchema,
  config: z.record(z.string(), z.unknown()),
  embedCode: z.string(),
  enabled: z.boolean(),
});

export type AppEmbedDto = z.infer<typeof appEmbedSchema>;

export const createAppEmbedSchema = appEmbedSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateAppEmbedDto = z.infer<typeof createAppEmbedSchema>;
export type UpdateAppEmbedDto = Partial<CreateAppEmbedDto>;

import { z } from 'zod';

import { namedDtoSchema } from './base';

/**
 * App Embed Contract
 */
export const appEmbedSchema = namedDtoSchema.extend({
  type: z.enum(['iframe', 'widget', 'script']),
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

import { z } from 'zod';

import { namedDtoSchema } from './base';

/**
 * App Embed Contract
 */
export const appEmbedTypeSchema = z.enum(['iframe', 'widget', 'script', 'internal-app']);
export type AppEmbedType = z.infer<typeof appEmbedTypeSchema>;

export const appEmbedIdSchema = z.enum(['chatbot', 'ai-paths', 'notes', 'products', 'kangur']);
export type AppEmbedId = z.infer<typeof appEmbedIdSchema>;

export const appEmbedSchema = namedDtoSchema.extend({
  type: appEmbedTypeSchema,
  config: z.record(z.string(), z.unknown()),
  embedCode: z.string(),
  enabled: z.boolean(),
});

export type AppEmbed = z.infer<typeof appEmbedSchema>;

export const createAppEmbedSchema = appEmbedSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateAppEmbed = z.infer<typeof createAppEmbedSchema>;
export type UpdateAppEmbed = Partial<CreateAppEmbed>;

export const APP_EMBED_SETTING_KEY = 'cms_app_embeds';
export const DEFAULT_KANGUR_APP_EMBED_ENTRY_PAGE = 'Game';

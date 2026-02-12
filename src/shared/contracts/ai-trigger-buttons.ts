import { z } from 'zod';

import { namedDtoSchema } from './base';

/**
 * Trigger button locations in the UI
 */
export const aiTriggerButtonLocationSchema = z.enum([
  'product_modal',
  'product_list',
  'note_modal',
  'note_list',
]);

export type AiTriggerButtonLocation = z.infer<typeof aiTriggerButtonLocationSchema>;

/**
 * Trigger button activation mode
 */
export const aiTriggerButtonModeSchema = z.enum(['click', 'toggle']);

export type AiTriggerButtonMode = z.infer<typeof aiTriggerButtonModeSchema>;

/**
 * Trigger button display style
 */
export const aiTriggerButtonDisplaySchema = z.enum(['icon', 'icon_label']);

export type AiTriggerButtonDisplay = z.infer<typeof aiTriggerButtonDisplaySchema>;

/**
 * AI Trigger Button Contract
 */
export const aiTriggerButtonSchema = namedDtoSchema.extend({
  iconId: z.string().nullable(),
  locations: z.array(aiTriggerButtonLocationSchema),
  mode: aiTriggerButtonModeSchema,
  display: aiTriggerButtonDisplaySchema,
});

export type AiTriggerButtonDto = z.infer<typeof aiTriggerButtonSchema>;

export const createAiTriggerButtonSchema = aiTriggerButtonSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateAiTriggerButtonDto = z.infer<typeof createAiTriggerButtonSchema>;
export type UpdateAiTriggerButtonDto = Partial<CreateAiTriggerButtonDto>;

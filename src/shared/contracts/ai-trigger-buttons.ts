import { z } from 'zod';

import { dtoBaseSchema } from './base';

/**
 * AI Trigger Button Contracts
 */
export const aiTriggerButtonLocationSchema = z.enum([
  'product_list_header',
  'product_list_item',
  'product_form_header',
  'product_form_footer',
  'cms_page_header',
  'cms_block_header',
  'admin_dashboard',
  'product_modal',
  'product_list',
  'product_row',
  'note_modal',
  'note_list',
]);

export type AiTriggerButtonLocation = z.infer<typeof aiTriggerButtonLocationSchema>;

export const aiTriggerButtonModeSchema = z.enum([
  'click',
  'toggle',
  'execute_path',
  'open_chat',
  'open_url',
  'copy_text',
]);

export type AiTriggerButtonMode = z.infer<typeof aiTriggerButtonModeSchema>;

export const aiTriggerButtonDisplaySchema = z.object({
  label: z.string(),
  icon: z.string().optional(),
  color: z.string().optional(),
  variant: z.enum(['default', 'outline', 'secondary', 'ghost', 'link']).optional(),
  size: z.enum(['default', 'sm', 'lg', 'icon']).optional(),
  showLabel: z.boolean().optional(),
  tooltip: z.string().optional(),
});

export type AiTriggerButtonDisplay = z.infer<typeof aiTriggerButtonDisplaySchema>;

export const aiTriggerButtonSchema = dtoBaseSchema.extend({
  name: z.string(),
  iconId: z.string().nullable().optional(),
  location: aiTriggerButtonLocationSchema.optional(),
  locations: z.array(aiTriggerButtonLocationSchema).optional(),
  mode: aiTriggerButtonModeSchema,
  display: aiTriggerButtonDisplaySchema,
  pathId: z.string().nullable().optional(),
  urlTemplate: z.string().nullable().optional(),
  textTemplate: z.string().nullable().optional(),
  contextTemplate: z.record(z.string(), z.unknown()).nullable().optional(),
  condition: z.string().nullable().optional(),
  isActive: z.boolean(),
  enabled: z.boolean().optional(),
  sortIndex: z.number(),
});

export type AiTriggerButtonDto = z.infer<typeof aiTriggerButtonSchema>;
export type AiTriggerButtonRecord = AiTriggerButtonDto;

export const createAiTriggerButtonSchema = aiTriggerButtonSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateAiTriggerButtonDto = z.infer<typeof createAiTriggerButtonSchema>;
export type UpdateAiTriggerButtonDto = Partial<CreateAiTriggerButtonDto>;

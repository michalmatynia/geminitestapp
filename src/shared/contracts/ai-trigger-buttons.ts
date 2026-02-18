import { z } from 'zod';

import { namedDtoSchema } from './base';

/**
 * AI Trigger Button DTOs
 */

export const aiTriggerButtonSchema = namedDtoSchema.extend({
  pathId: z.string().optional(),
  icon: z.string().nullable().optional(),
  iconId: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
  style: z.enum(['button', 'icon']).optional(),
  size: z.enum(['small', 'medium', 'large']).optional(),
  position: z.enum(['top-left', 'top-right', 'bottom-left', 'bottom-right', 'inline']).optional(),
  contextMapping: z.record(z.string(), z.string()).optional(),
  enabled: z.boolean().optional(),
  // New fields from usage
  locations: z.array(z.string()).optional(),
  mode: z.enum(['click', 'toggle']).optional(),
  display: z.enum(['icon', 'label', 'icon_label']).optional(),
});

export type AiTriggerButtonDto = z.infer<typeof aiTriggerButtonSchema>;

export const createAiTriggerButtonSchema = aiTriggerButtonSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateAiTriggerButtonDto = z.infer<typeof createAiTriggerButtonSchema>;
export type UpdateAiTriggerButtonDto = Partial<CreateAiTriggerButtonDto>;

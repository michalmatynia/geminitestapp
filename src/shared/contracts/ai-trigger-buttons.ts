import { z } from 'zod';

import { dtoBaseSchema } from './base';

/**
 * AI Trigger Button Contracts
 */
export const aiTriggerButtonLocationSchema = z.enum([
  'product_modal',
  'product_list',
  'product_row',
  'note_modal',
  'note_list',
  'product_list_header',
  'product_list_item',
  'product_form_header',
  'product_form_footer',
  'cms_page_header',
  'cms_block_header',
  'admin_dashboard',
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

export const aiTriggerButtonDisplayModeSchema = z.enum(['icon', 'icon_label']);
export type AiTriggerButtonDisplayMode = z.infer<typeof aiTriggerButtonDisplayModeSchema>;

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
  locations: z.array(aiTriggerButtonLocationSchema).optional(),
  mode: aiTriggerButtonModeSchema,
  display: aiTriggerButtonDisplaySchema,
  pathId: z.string().nullable().optional(),
  urlTemplate: z.string().nullable().optional(),
  textTemplate: z.string().nullable().optional(),
  contextTemplate: z.record(z.string(), z.unknown()).nullable().optional(),
  condition: z.string().nullable().optional(),
  enabled: z.boolean().optional(),
  sortIndex: z.number(),
}).strict();

export type AiTriggerButtonDto = z.infer<typeof aiTriggerButtonSchema>;
export type AiTriggerButtonRecord = AiTriggerButtonDto;

export const createAiTriggerButtonSchema = aiTriggerButtonSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateAiTriggerButtonDto = z.infer<typeof createAiTriggerButtonSchema>;
export type UpdateAiTriggerButtonDto = Partial<CreateAiTriggerButtonDto>;

// ---------------------------------------------------------------------------
// Validation Schemas (moved from features to shared contracts)
// ---------------------------------------------------------------------------

const normalizePathId = (value: unknown): string | null | undefined => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const normalizeDisplayForRead = (value: unknown): AiTriggerButtonDisplayMode | undefined => {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim().toLowerCase();
  if (normalized === 'icon') return 'icon';
  if (normalized === 'icon_label') return 'icon_label';
  return undefined;
};

const normalizeModeForRead = (value: unknown): AiTriggerButtonMode | undefined => {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim().toLowerCase();
  const parsed = aiTriggerButtonModeSchema.safeParse(normalized);
  return parsed.success ? parsed.data : undefined;
};

export const aiTriggerButtonRecordValidatorSchema = z.object({
  id: z.string().trim().min(1),
  name: z.string().trim().min(1),
  iconId: z.string().trim().min(1).nullable().optional(),
  pathId: z.preprocess(normalizePathId, z.string().trim().min(1).nullable().optional()),
  enabled: z.boolean().optional(),
  locations: z.array(aiTriggerButtonLocationSchema).optional(),
  mode: z.preprocess(normalizeModeForRead, aiTriggerButtonModeSchema).optional(),
  display: z
    .preprocess((value: unknown): unknown => {
      if (value === undefined) return undefined;
      return normalizeDisplayForRead(value) ?? value;
    }, aiTriggerButtonDisplayModeSchema)
    .optional(),
  createdAt: z
    .preprocess((value) => (value instanceof Date ? value.toISOString() : value), z.string().min(1))
    .optional(),
  updatedAt: z
    .preprocess((value) => (value instanceof Date ? value.toISOString() : value), z.string().min(1))
    .optional(),
  sortIndex: z.coerce.number().optional(),
}).strict();

export const aiTriggerButtonCreatePayloadSchema = z.object({
  name: z.string().trim().min(1),
  iconId: z.string().trim().min(1).nullable().optional().default(null),
  pathId: z.preprocess(normalizePathId, z.string().trim().min(1).nullable().optional()),
  enabled: z.boolean().optional().default(true),
  locations: z.array(aiTriggerButtonLocationSchema).min(1),
  mode: aiTriggerButtonModeSchema.optional().default('click'),
  display: aiTriggerButtonDisplayModeSchema.optional().default('icon_label'),
}).strict();

export const aiTriggerButtonUpdatePayloadSchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    iconId: z.string().trim().min(1).nullable().optional(),
    pathId: z.preprocess(normalizePathId, z.string().trim().min(1).nullable().optional()),
    enabled: z.boolean().optional(),
    locations: z.array(aiTriggerButtonLocationSchema).min(1).optional(),
    mode: aiTriggerButtonModeSchema.optional(),
    display: aiTriggerButtonDisplayModeSchema.optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'No updates provided',
  });

export const aiTriggerButtonReorderPayloadSchema = z.object({
  orderedIds: z.array(z.string().trim().min(1)),
}).strict();

export type AiTriggerButtonCreatePayload = z.infer<typeof aiTriggerButtonCreatePayloadSchema>;
export type AiTriggerButtonUpdatePayload = z.infer<typeof aiTriggerButtonUpdatePayloadSchema>;
export type AiTriggerButtonReorderPayload = z.infer<typeof aiTriggerButtonReorderPayloadSchema>;

/**
 * Trigger Event Arguments
 */
export type TriggerEventEntityType = 'product' | 'note' | 'custom';

export type FireAiPathTriggerEventArgs = {
  triggerEventId: string;
  triggerLabel?: string | null | undefined;
  preferredPathId?: string | null | undefined;
  entityType: TriggerEventEntityType;
  entityId?: string | null | undefined;
  getEntityJson?: (() => Record<string, unknown> | null) | undefined;
  event?: React.MouseEvent | undefined;
  source?:
    | { tab?: string | undefined; location?: string | undefined; page?: string | undefined }
    | null
    | undefined;
  extras?: Record<string, unknown> | null | undefined;
  onSuccess?: (runId: string) => void;
  onError?: (error: string) => void;
  onFinished?: () => void;
  onProgress?:
    | ((payload: {
        status: 'running' | 'success' | 'error';
        progress: number;
        completedNodes: number;
        totalNodes: number;
        node?: { id: string; title?: string | null; type?: string | null } | null | undefined;
      }) => void)
    | undefined;
};

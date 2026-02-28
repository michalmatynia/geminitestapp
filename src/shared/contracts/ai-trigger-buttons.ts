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

const coerceOptionalBoolean = (value: unknown): boolean | undefined => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    if (value === 1) return true;
    if (value === 0) return false;
    return undefined;
  }
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true' || normalized === '1') return true;
    if (normalized === 'false' || normalized === '0') return false;
  }
  return undefined;
};

const normalizeDisplayForRead = (value: unknown): AiTriggerButtonDisplayMode | undefined => {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const showLabel = coerceOptionalBoolean((value as Record<string, unknown>)['showLabel']);
    return showLabel === false ? 'icon' : 'icon_label';
  }
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim().toLowerCase();
  if (normalized === 'icon') return 'icon';
  if (normalized === 'icon_label') return 'icon_label';
  if (normalized === 'label') return 'icon_label';
  return undefined;
};

const normalizeModeForRead = (
  value: unknown
): AiTriggerButtonMode | undefined => {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim().toLowerCase();
  const parsed = aiTriggerButtonModeSchema.safeParse(normalized);
  return parsed.success ? parsed.data : undefined;
};

const normalizeLocationsForRead = (
  value: unknown
): AiTriggerButtonLocation[] | undefined => {
  const source = Array.isArray(value) ? value : typeof value === 'string' ? [value] : [];
  const seen = new Set<AiTriggerButtonLocation>();
  source.forEach((entry: unknown) => {
    if (typeof entry !== 'string') return;
    const normalized = entry.trim();
    const parsed = aiTriggerButtonLocationSchema.safeParse(normalized);
    if (!parsed.success) return;
    seen.add(parsed.data);
  });
  return seen.size > 0 ? Array.from(seen) : undefined;
};

export const aiTriggerButtonRecordValidatorSchema = z.object({
  id: z.string().trim().min(1),
  name: z.string().trim().min(1),
  icon: z.string().trim().min(1).nullable().optional(),
  iconId: z.string().trim().min(1).nullable().optional(),
  pathId: z.preprocess(normalizePathId, z.string().trim().min(1).nullable().optional()),
  enabled: z.preprocess(coerceOptionalBoolean, z.boolean().optional()),
  locations: z
    .preprocess(normalizeLocationsForRead, z.array(aiTriggerButtonLocationSchema))
    .optional(),
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
  isActive: z.preprocess(coerceOptionalBoolean, z.boolean().optional()),
  sortIndex: z.coerce.number().optional(),
});

export const aiTriggerButtonCreatePayloadSchema = z.object({
  name: z.string().trim().min(1),
  iconId: z.string().trim().min(1).nullable().optional().default(null),
  pathId: z.preprocess(normalizePathId, z.string().trim().min(1).nullable().optional()),
  enabled: z.boolean().optional().default(true),
  locations: z.array(aiTriggerButtonLocationSchema).min(1),
  mode: aiTriggerButtonModeSchema.optional().default('click'),
  display: aiTriggerButtonDisplayModeSchema.optional().default('icon_label'),
});

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
  .refine((value) => Object.keys(value).length > 0, {
    message: 'No updates provided',
  });

export const aiTriggerButtonReorderPayloadSchema = z.object({
  orderedIds: z.array(z.string().trim().min(1)),
});

export type AiTriggerButtonCreatePayload = z.infer<typeof aiTriggerButtonCreatePayloadSchema>;
export type AiTriggerButtonUpdatePayload = z.infer<typeof aiTriggerButtonUpdatePayloadSchema>;
export type AiTriggerButtonReorderPayload = z.infer<typeof aiTriggerButtonReorderPayloadSchema>;

import { z } from 'zod';

import type { AiTriggerButtonRecord } from '@/shared/contracts/ai-trigger-buttons';

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

export const aiTriggerButtonModeSchema = z.enum([
  'click',
  'toggle',
  'execute_path',
  'open_chat',
  'open_url',
  'copy_text',
]);
export const aiTriggerButtonDisplaySchema = z.enum(['icon', 'icon_label']);

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

const normalizeDisplayForRead = (value: unknown): 'icon' | 'icon_label' | undefined => {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim().toLowerCase();
  if (normalized === 'icon') return 'icon';
  if (normalized === 'icon_label' || normalized === 'label') return 'icon_label';
  return undefined;
};

const normalizeModeForRead = (value: unknown): 'click' | 'toggle' | 'execute_path' | 'open_chat' | 'open_url' | 'copy_text' | undefined => {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim().toLowerCase();
  if (
    normalized === 'click' ||
    normalized === 'toggle' ||
    normalized === 'execute_path' ||
    normalized === 'open_chat' ||
    normalized === 'open_url' ||
    normalized === 'copy_text'
  )
    return normalized as any;
  return undefined;
};

const normalizeLocationsForRead = (
  value: unknown
): Array<
  | 'product_modal'
  | 'product_list'
  | 'product_row'
  | 'note_modal'
  | 'note_list'
  | 'product_list_header'
  | 'product_list_item'
  | 'product_form_header'
  | 'product_form_footer'
  | 'cms_page_header'
  | 'cms_block_header'
  | 'admin_dashboard'
> | undefined => {
  const source = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? [value]
      : [];
  const seen = new Set<
    | 'product_modal'
    | 'product_list'
    | 'product_row'
    | 'note_modal'
    | 'note_list'
    | 'product_list_header'
    | 'product_list_item'
    | 'product_form_header'
    | 'product_form_footer'
    | 'cms_page_header'
    | 'cms_block_header'
    | 'admin_dashboard'
  >();
  source.forEach((entry: unknown) => {
    if (typeof entry !== 'string') return;
    const normalized = entry.trim();
    const parsed = aiTriggerButtonLocationSchema.safeParse(normalized);
    if (!parsed.success) return;
    seen.add(parsed.data);
  });
  return seen.size > 0 ? Array.from(seen) : undefined;
};

export const aiTriggerButtonRecordSchema = z.object({
  id: z.string().trim().min(1),
  name: z.string().trim().min(1),
  icon: z.string().trim().min(1).nullable().optional(),
  iconId: z.string().trim().min(1).nullable().optional(),
  enabled: z.preprocess(coerceOptionalBoolean, z.boolean().optional()),
  locations: z
    .preprocess(normalizeLocationsForRead, z.array(aiTriggerButtonLocationSchema))
    .optional(),
  mode: z.preprocess(normalizeModeForRead, aiTriggerButtonModeSchema).optional(),
  display: z.preprocess(normalizeDisplayForRead, aiTriggerButtonDisplaySchema).optional(),
  createdAt: z
    .preprocess((value) => (value instanceof Date ? value.toISOString() : value), z.string().min(1))
    .optional(),
  updatedAt: z
    .preprocess((value) => (value instanceof Date ? value.toISOString() : value), z.string().min(1))
    .optional(),
});

export const aiTriggerButtonCreateSchema = z.object({
  name: z.string().trim().min(1),
  iconId: z.string().trim().min(1).nullable().optional().default(null),
  enabled: z.boolean().optional().default(true),
  locations: z.array(aiTriggerButtonLocationSchema).min(1),
  mode: aiTriggerButtonModeSchema.optional().default('click'),
  display: aiTriggerButtonDisplaySchema.optional().default('icon_label'),
});

export const aiTriggerButtonUpdateSchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    iconId: z.string().trim().min(1).nullable().optional(),
    enabled: z.boolean().optional(),
    locations: z.array(aiTriggerButtonLocationSchema).min(1).optional(),
    mode: aiTriggerButtonModeSchema.optional(),
    display: aiTriggerButtonDisplaySchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'No updates provided',
  });

export const aiTriggerButtonReorderSchema = z.object({
  orderedIds: z.array(z.string().trim().min(1)),
});

export type AiTriggerButtonCreatePayload = z.infer<typeof aiTriggerButtonCreateSchema>;
export type AiTriggerButtonUpdatePayload = z.infer<typeof aiTriggerButtonUpdateSchema>;
export type AiTriggerButtonReorderPayload = z.infer<typeof aiTriggerButtonReorderSchema>;

const normalizeAiTriggerButtonRecord = (
  record: z.infer<typeof aiTriggerButtonRecordSchema>
): AiTriggerButtonRecord => {
  const now = new Date().toISOString();
  const locations =
    Array.isArray(record.locations) && record.locations.length > 0
      ? record.locations
      : (['product_modal'] as const);

  return {
    id: record.id,
    name: record.name,
    iconId: record.iconId ?? record.icon ?? null,
    enabled: record.enabled ?? true,
    locations: [...locations],
    mode: record.mode ?? 'click',
    display: record.display ?? 'icon_label',
    createdAt: record.createdAt ?? now,
    updatedAt: record.updatedAt ?? record.createdAt ?? now,
  };
};

export const parseAiTriggerButtonsRaw = (raw: string | null): AiTriggerButtonRecord[] => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];

    const normalized: AiTriggerButtonRecord[] = [];
    parsed.forEach((value: unknown) => {
      const validated = aiTriggerButtonRecordSchema.safeParse(value);
      if (!validated.success) return;
      normalized.push(normalizeAiTriggerButtonRecord(validated.data));
    });
    return normalized;
  } catch {
    return [];
  }
};

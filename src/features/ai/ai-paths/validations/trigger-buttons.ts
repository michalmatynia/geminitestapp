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

type AiTriggerButtonDisplayMode = z.infer<typeof aiTriggerButtonDisplaySchema>;

const normalizeText = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

const normalizePathId = (
  value: unknown
): string | null | undefined => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const isOpaqueTriggerButtonName = (value: string): boolean => {
  const normalized = value.trim();
  if (!normalized) return false;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(normalized)) {
    return true;
  }
  if (/^[0-9a-f]{24}$/i.test(normalized)) return true;
  if (/^[0-9a-f]{12,}$/i.test(normalized)) return true;
  return /^[a-z0-9_-]{24,}$/i.test(normalized);
};

const readDisplayLabel = (value: Record<string, unknown>): string => {
  const displayValue = value['display'];
  if (!displayValue || typeof displayValue !== 'object' || Array.isArray(displayValue)) {
    return '';
  }
  return normalizeText((displayValue as Record<string, unknown>)['label']);
};

const readPathIdForRead = (value: Record<string, unknown>): string | null => {
  const directPathId = normalizePathId(value['pathId']);
  if (typeof directPathId === 'string') return directPathId;
  const rawPathIds = value['pathIds'];
  if (!Array.isArray(rawPathIds)) return null;
  const firstPathId = rawPathIds
    .map((entry: unknown): string | null | undefined => normalizePathId(entry))
    .find((entry: string | null | undefined): entry is string => typeof entry === 'string');
  return firstPathId ?? null;
};

const normalizeRecordForRead = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const source = value as Record<string, unknown>;
  const id = normalizeText(source['id']);
  if (!id) return null;

  const rawName = normalizeText(source['name']);
  const displayLabel = readDisplayLabel(source);
  const legacyLabel = normalizeText(source['label']);
  let resolvedName = rawName || displayLabel || legacyLabel;
  if (!resolvedName) return null;

  if (displayLabel) {
    const rawNameLooksOpaque =
      rawName.length > 0 && (rawName === id || isOpaqueTriggerButtonName(rawName));
    const displayLooksOpaque =
      displayLabel === id || isOpaqueTriggerButtonName(displayLabel);
    if (rawNameLooksOpaque && !displayLooksOpaque) {
      resolvedName = displayLabel;
    }
  }

  return {
    ...source,
    id,
    name: resolvedName,
    pathId: readPathIdForRead(source),
  };
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

const normalizeDisplayForRead = (
  value: unknown
): AiTriggerButtonDisplayMode | undefined => {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const showLabel = coerceOptionalBoolean(
      (value as Record<string, unknown>)['showLabel']
    );
    return showLabel === false ? 'icon' : 'icon_label';
  }
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim().toLowerCase();
  if (normalized === 'icon') return 'icon';
  if (normalized === 'icon_label') return 'icon_label';
  if (normalized === 'label') return 'icon_label';
  return undefined;
};

const normalizeModeForRead = (value: unknown): 'click' | 'toggle' | 'execute_path' | 'open_chat' | 'open_url' | 'copy_text' | undefined => {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim().toLowerCase();
  if (normalized === 'click') return 'click';
  if (normalized === 'toggle') return 'toggle';
  if (normalized === 'execute_path') return 'execute_path';
  if (normalized === 'open_chat') return 'open_chat';
  if (normalized === 'open_url') return 'open_url';
  if (normalized === 'copy_text') return 'copy_text';
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
    }, aiTriggerButtonDisplaySchema)
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

export const aiTriggerButtonCreateSchema = z.object({
  name: z.string().trim().min(1),
  iconId: z.string().trim().min(1).nullable().optional().default(null),
  pathId: z.preprocess(normalizePathId, z.string().trim().min(1).nullable().optional()),
  enabled: z.boolean().optional().default(true),
  locations: z.array(aiTriggerButtonLocationSchema).min(1),
  mode: aiTriggerButtonModeSchema.optional().default('click'),
  display: aiTriggerButtonDisplaySchema.optional().default('icon_label'),
});

export const aiTriggerButtonUpdateSchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    iconId: z.string().trim().min(1).nullable().optional(),
    pathId: z.preprocess(normalizePathId, z.string().trim().min(1).nullable().optional()),
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

export const buildCanonicalTriggerButtonDisplay = (
  name: string,
  mode: AiTriggerButtonDisplayMode = 'icon_label'
): AiTriggerButtonRecord['display'] => ({
  label: name,
  showLabel: mode !== 'icon',
});

const normalizeAiTriggerButtonRecord = (
  record: z.infer<typeof aiTriggerButtonRecordSchema>
): AiTriggerButtonRecord => {
  const now = new Date().toISOString();
  const resolvedEnabled = record.enabled ?? true;
  const resolvedIsActive = record.isActive ?? true;
  const isVisible = resolvedEnabled !== false && resolvedIsActive !== false;
  const locations =
    Array.isArray(record.locations) && record.locations.length > 0
      ? record.locations
      : (['product_modal'] as const);

  return {
    id: record.id,
    name: record.name,
    iconId: record.iconId ?? record.icon ?? null,
    pathId: record.pathId ?? null,
    enabled: isVisible,
    locations: [...locations],
    mode: record.mode ?? 'click',
    display: buildCanonicalTriggerButtonDisplay(
      record.name,
      record.display ?? 'icon_label'
    ),
    createdAt: record.createdAt ?? now,
    updatedAt: record.updatedAt ?? record.createdAt ?? now,
    isActive: isVisible,
    sortIndex: record.sortIndex ?? 0,
  };
};

export const parseAiTriggerButtonsRaw = (raw: string | null): AiTriggerButtonRecord[] => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];

    const normalized: AiTriggerButtonRecord[] = [];
    parsed.forEach((value: unknown) => {
      const normalizedRecord = normalizeRecordForRead(value);
      if (!normalizedRecord) return;
      const validated = aiTriggerButtonRecordSchema.safeParse(normalizedRecord);
      if (!validated.success) return;
      normalized.push(normalizeAiTriggerButtonRecord(validated.data));
    });
    return normalized;
  } catch {
    return [];
  }
};

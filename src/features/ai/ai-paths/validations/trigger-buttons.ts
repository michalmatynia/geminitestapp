import { z } from 'zod';

import type { AiTriggerButtonRecord } from '@/shared/types/domain/ai-trigger-buttons';

export const aiTriggerButtonLocationSchema = z.enum([
  'product_modal',
  'product_list',
  'note_modal',
  'note_list',
]);

export const aiTriggerButtonModeSchema = z.enum(['click', 'toggle']);
export const aiTriggerButtonDisplaySchema = z.enum(['icon', 'icon_label']);

export const aiTriggerButtonRecordSchema = z.object({
  id: z.string().trim().min(1),
  name: z.string().trim().min(1),
  iconId: z.string().trim().min(1).nullable().optional(),
  locations: z
    .preprocess(
      (value) => (typeof value === 'string' ? [value] : value),
      z.array(aiTriggerButtonLocationSchema)
    )
    .optional(),
  mode: aiTriggerButtonModeSchema.optional(),
  display: aiTriggerButtonDisplaySchema.optional(),
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
  locations: z.array(aiTriggerButtonLocationSchema).min(1),
  mode: aiTriggerButtonModeSchema.optional().default('click'),
  display: aiTriggerButtonDisplaySchema.optional().default('icon_label'),
});

export const aiTriggerButtonUpdateSchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    iconId: z.string().trim().min(1).nullable().optional(),
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
    iconId: record.iconId ?? null,
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

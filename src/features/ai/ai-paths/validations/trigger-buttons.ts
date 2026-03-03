import { z } from 'zod';

import type { AiTriggerButtonRecord } from '@/shared/contracts/ai-trigger-buttons';
import {
  aiTriggerButtonLocationSchema,
  aiTriggerButtonModeSchema,
  aiTriggerButtonDisplayModeSchema as aiTriggerButtonDisplaySchema,
  aiTriggerButtonRecordValidatorSchema as aiTriggerButtonRecordSchema,
  aiTriggerButtonCreatePayloadSchema as aiTriggerButtonCreateSchema,
  aiTriggerButtonUpdatePayloadSchema as aiTriggerButtonUpdateSchema,
  aiTriggerButtonReorderPayloadSchema as aiTriggerButtonReorderSchema,
} from '@/shared/contracts/ai-trigger-buttons';

export {
  aiTriggerButtonLocationSchema,
  aiTriggerButtonModeSchema,
  aiTriggerButtonDisplaySchema,
  aiTriggerButtonRecordSchema,
  aiTriggerButtonCreateSchema,
  aiTriggerButtonUpdateSchema,
  aiTriggerButtonReorderSchema,
};

export type {
  AiTriggerButtonCreatePayload,
  AiTriggerButtonUpdatePayload,
  AiTriggerButtonReorderPayload,
} from '@/shared/contracts/ai-trigger-buttons';

const normalizeText = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

const normalizePathId = (value: unknown): string | null | undefined => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const normalizeRecordForRead = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const source = value as Record<string, unknown>;
  const id = normalizeText(source['id']);
  if (!id) return null;

  const name = normalizeText(source['name']);
  if (!name) return null;

  return {
    ...source,
    id,
    name,
    pathId: normalizePathId(source['pathId']),
  };
};

export const buildCanonicalTriggerButtonDisplay = (
  name: string,
  mode: string = 'icon_label'
): AiTriggerButtonRecord['display'] => ({
  label: name,
  showLabel: mode !== 'icon',
});

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
    pathId: record.pathId ?? null,
    enabled: record.enabled ?? true,
    locations: [...locations],
    mode: record.mode ?? 'click',
    display: buildCanonicalTriggerButtonDisplay(record.name, record.display ?? 'icon_label'),
    createdAt: record.createdAt ?? now,
    updatedAt: record.updatedAt ?? record.createdAt ?? now,
    sortIndex: record.sortIndex ?? 0,
  };
};

export const parseAiTriggerButtonsRaw = (raw: string | null): AiTriggerButtonRecord[] => {
  if (!raw) return [];
  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed)) {
    throw new Error('Invalid trigger button settings payload.');
  }

  return parsed.map((value: unknown, index: number): AiTriggerButtonRecord => {
    const normalizedRecord = normalizeRecordForRead(value);
    if (!normalizedRecord) {
      throw new Error(`Invalid trigger button record at index ${index}.`);
    }
    return normalizeAiTriggerButtonRecord(aiTriggerButtonRecordSchema.parse(normalizedRecord));
  });
};

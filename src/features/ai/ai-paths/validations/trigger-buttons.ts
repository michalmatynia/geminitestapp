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
    const displayLooksOpaque = displayLabel === id || isOpaqueTriggerButtonName(displayLabel);
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
    display: buildCanonicalTriggerButtonDisplay(record.name, record.display ?? 'icon_label'),
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

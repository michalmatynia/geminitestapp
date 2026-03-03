import { z } from 'zod';

import type { AiTriggerButtonRecord } from '@/shared/contracts/ai-trigger-buttons';
import { validationError } from '@/shared/errors/app-error';
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

export const buildCanonicalTriggerButtonDisplay = (
  name: string,
  mode: string = 'icon_label'
): AiTriggerButtonRecord['display'] => ({
  label: name,
  showLabel: mode !== 'icon',
});

const toStoredDisplayMode = (
  display: AiTriggerButtonRecord['display'] | null | undefined
): 'icon' | 'icon_label' => (display?.showLabel === false ? 'icon' : 'icon_label');

const toStoredAiTriggerButtonRecord = (
  record: AiTriggerButtonRecord
): z.infer<typeof aiTriggerButtonRecordSchema> => {
  const parsedRecord = aiTriggerButtonRecordSchema.safeParse({
    id: record.id,
    name: record.name,
    iconId: record.iconId ?? null,
    pathId: record.pathId ?? null,
    enabled: record.enabled,
    locations: record.locations,
    mode: record.mode,
    display: toStoredDisplayMode(record.display),
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    sortIndex: record.sortIndex,
  });
  if (!parsedRecord.success) {
    throw validationError('Invalid trigger button record.', {
      source: 'ai_paths.trigger_buttons',
      reason: 'record_validation_failed',
      issues: parsedRecord.error.flatten(),
    });
  }
  return parsedRecord.data;
};

export const parseAiTriggerButtonsRaw = (raw: string | null): AiTriggerButtonRecord[] => {
  if (!raw) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch (error) {
    throw validationError('Invalid trigger button settings payload.', {
      source: 'ai_paths.trigger_buttons',
      reason: 'invalid_json',
      cause: error instanceof Error ? error.message : 'unknown_error',
    });
  }

  if (!Array.isArray(parsed)) {
    throw validationError('Invalid trigger button settings payload.', {
      source: 'ai_paths.trigger_buttons',
      reason: 'payload_not_array',
    });
  }

  return parsed.map((value: unknown, index: number): AiTriggerButtonRecord => {
    const parsedRecord = aiTriggerButtonRecordSchema.safeParse(value);
    if (!parsedRecord.success) {
      throw validationError('Invalid trigger button record.', {
        source: 'ai_paths.trigger_buttons',
        reason: 'record_validation_failed',
        index,
        issues: parsedRecord.error.flatten(),
      });
    }
    return {
      id: parsedRecord.data.id,
      name: parsedRecord.data.name,
      iconId: parsedRecord.data.iconId ?? null,
      pathId: parsedRecord.data.pathId ?? null,
      enabled: parsedRecord.data.enabled,
      locations: [...parsedRecord.data.locations],
      mode: parsedRecord.data.mode,
      display: buildCanonicalTriggerButtonDisplay(parsedRecord.data.name, parsedRecord.data.display),
      createdAt: parsedRecord.data.createdAt,
      updatedAt: parsedRecord.data.updatedAt,
      sortIndex: parsedRecord.data.sortIndex,
    };
  });
};

export const serializeAiTriggerButtonsRaw = (records: AiTriggerButtonRecord[]): string => {
  return JSON.stringify(records.map(toStoredAiTriggerButtonRecord));
};

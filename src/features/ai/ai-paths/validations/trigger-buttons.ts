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

export type AiTriggerButtonParseReportReason = 'ok';

export type AiTriggerButtonsRawParseReport = {
  records: AiTriggerButtonRecord[];
  shouldPersist: boolean;
  canonicalRaw: string;
  reason: AiTriggerButtonParseReportReason;
  droppedCount: number;
};

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

const toCanonicalAiTriggerButtonRecord = (
  record: z.infer<typeof aiTriggerButtonRecordSchema>
): AiTriggerButtonRecord => {
  return {
    id: record.id,
    name: record.name,
    iconId: record.iconId ?? null,
    pathId: record.pathId ?? null,
    enabled: record.enabled,
    locations: [...record.locations],
    mode: record.mode,
    display: buildCanonicalTriggerButtonDisplay(record.name, record.display),
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    sortIndex: record.sortIndex,
  };
};

export const parseAiTriggerButtonsRawWithReport = (
  raw: string | null
): AiTriggerButtonsRawParseReport => {
  if (!raw) {
    return {
      records: [],
      shouldPersist: false,
      canonicalRaw: '[]',
      reason: 'ok',
      droppedCount: 0,
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch (error) {
    throw validationError('Invalid AI trigger button settings payload.', {
      source: 'ai_paths.trigger_buttons',
      reason: 'invalid_json',
      cause: error instanceof Error ? error.message : 'unknown_error',
    });
  }

  if (!Array.isArray(parsed)) {
    throw validationError('Invalid AI trigger button settings payload.', {
      source: 'ai_paths.trigger_buttons',
      reason: 'payload_not_array',
    });
  }

  const records = parsed.map((value: unknown, index: number): AiTriggerButtonRecord => {
    const parsedRecord = aiTriggerButtonRecordSchema.safeParse(value);
    if (!parsedRecord.success) {
      throw validationError('Invalid AI trigger button record payload.', {
        source: 'ai_paths.trigger_buttons',
        reason: 'record_validation_failed',
        index,
        issues: parsedRecord.error.flatten(),
      });
    }
    return toCanonicalAiTriggerButtonRecord(parsedRecord.data);
  });

  return {
    records,
    shouldPersist: false,
    canonicalRaw: serializeAiTriggerButtonsRaw(records),
    reason: 'ok',
    droppedCount: 0,
  };
};

export const parseAiTriggerButtonsRaw = (raw: string | null): AiTriggerButtonRecord[] => {
  return parseAiTriggerButtonsRawWithReport(raw).records;
};

export const serializeAiTriggerButtonsRaw = (records: AiTriggerButtonRecord[]): string => {
  return JSON.stringify(records.map(toStoredAiTriggerButtonRecord));
};

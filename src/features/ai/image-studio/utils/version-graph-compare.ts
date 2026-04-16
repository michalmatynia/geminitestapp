import type { ImageStudioSlotRecord } from '@/shared/contracts/image-studio';
import type { SlotGenerationMetadata } from '@/shared/contracts/image-studio/slot';

import { readMeta } from './metadata';

// ── Types ────────────────────────────────────────────────────────────────────

export interface CompareRow {
  field: string;
  valueA: string | null;
  valueB: string | null;
  isDifferent: boolean;
}

// ── Compare utility ──────────────────────────────────────────────────────────

type CompareFieldInput = {
  field: string;
  a: string | null;
  b: string | null;
};
type StringGenerationParamKey = 'prompt' | 'model' | 'timestamp' | 'runId';

const toNullableString = (value: string | undefined): string | null => value ?? null;

const readGenerationStringParam = (
  meta: SlotGenerationMetadata,
  key: StringGenerationParamKey
): string | null => toNullableString(meta.generationParams?.[key]);

const readRole = (meta: SlotGenerationMetadata): string | null => meta.role ?? null;

const formatOutputIndex = (
  outputIndex: number | null | undefined,
  outputCount: number | null | undefined
): string | null =>
  outputIndex !== null && outputIndex !== undefined
    ? `${outputIndex + 1}/${outputCount ?? '?'}`
    : null;

const buildCompareFields = (
  metaA: SlotGenerationMetadata,
  metaB: SlotGenerationMetadata
): CompareFieldInput[] => [
  {
    field: 'Prompt',
    a: readGenerationStringParam(metaA, 'prompt'),
    b: readGenerationStringParam(metaB, 'prompt'),
  },
  {
    field: 'Model',
    a: readGenerationStringParam(metaA, 'model'),
    b: readGenerationStringParam(metaB, 'model'),
  },
  { field: 'Type', a: readRole(metaA), b: readRole(metaB) },
  {
    field: 'Timestamp',
    a: readGenerationStringParam(metaA, 'timestamp'),
    b: readGenerationStringParam(metaB, 'timestamp'),
  },
  {
    field: 'Run ID',
    a: readGenerationStringParam(metaA, 'runId'),
    b: readGenerationStringParam(metaB, 'runId'),
  },
  {
    field: 'Output #',
    a: formatOutputIndex(metaA.generationParams?.outputIndex, metaA.generationParams?.outputCount),
    b: formatOutputIndex(metaB.generationParams?.outputIndex, metaB.generationParams?.outputCount),
  },
];

const hasCompareFieldValue = (field: CompareFieldInput): boolean =>
  field.a !== null || field.b !== null;

const toCompareRow = (field: CompareFieldInput): CompareRow => ({
  field: field.field,
  valueA: field.a,
  valueB: field.b,
  isDifferent: field.a !== field.b,
});

/** Compare generation parameters between two slots, returning rows for a diff table. */
export function compareGenerationParams(
  slotA: ImageStudioSlotRecord,
  slotB: ImageStudioSlotRecord
): CompareRow[] {
  const metaA = readMeta(slotA);
  const metaB = readMeta(slotB);

  return buildCompareFields(metaA, metaB).filter(hasCompareFieldValue).map(toCompareRow);
}

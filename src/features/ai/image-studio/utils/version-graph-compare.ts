import type { ImageStudioSlotRecord } from '@/shared/contracts/image-studio';

import { readMeta } from './metadata';

// ── Types ────────────────────────────────────────────────────────────────────

export interface CompareRow {
  field: string;
  valueA: string | null;
  valueB: string | null;
  isDifferent: boolean;
}

// ── Compare utility ──────────────────────────────────────────────────────────

/** Compare generation parameters between two slots, returning rows for a diff table. */
export function compareGenerationParams(
  slotA: ImageStudioSlotRecord,
  slotB: ImageStudioSlotRecord
): CompareRow[] {
  const metaA = readMeta(slotA);
  const metaB = readMeta(slotB);

  const paramsA = metaA.generationParams;
  const paramsB = metaB.generationParams;

  const fields: Array<{ field: string; a: string | null; b: string | null }> = [
    {
      field: 'Prompt',
      a: paramsA?.prompt ?? null,
      b: paramsB?.prompt ?? null,
    },
    {
      field: 'Model',
      a: paramsA?.model ?? null,
      b: paramsB?.model ?? null,
    },
    {
      field: 'Type',
      a: metaA.role ?? null,
      b: metaB.role ?? null,
    },
    {
      field: 'Timestamp',
      a: paramsA?.timestamp ?? null,
      b: paramsB?.timestamp ?? null,
    },
    {
      field: 'Run ID',
      a: paramsA?.runId ?? null,
      b: paramsB?.runId ?? null,
    },
    {
      field: 'Output #',
      a:
        paramsA?.outputIndex != null
          ? `${paramsA.outputIndex + 1}/${paramsA.outputCount ?? '?'}`
          : null,
      b:
        paramsB?.outputIndex != null
          ? `${paramsB.outputIndex + 1}/${paramsB.outputCount ?? '?'}`
          : null,
    },
  ];

  return fields
    .filter((f) => f.a !== null || f.b !== null) // Only show rows where at least one side has a value
    .map((f) => ({
      field: f.field,
      valueA: f.a,
      valueB: f.b,
      isDifferent: f.a !== f.b,
    }));
}

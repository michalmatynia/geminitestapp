import type { PersonaMemoryRecord } from '@/shared/contracts/persona-memory';

export function formatPersonaMemoryDate(value?: string | null): string {
  if (value === null || value === undefined) {
    return '-';
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return '-';
  }
  const parsed = new Date(trimmed);
  const time = parsed.getTime();
  if (Number.isNaN(time)) {
    return '-';
  }
  return parsed.toLocaleString();
}

export function pickFirstNonEmptyNullableString(
  candidates: ReadonlyArray<string | null | undefined>,
  fallback: string
): string {
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim().length > 0) {
      return candidate;
    }
  }
  return fallback;
}

export function formatPersonaMemoryPrimaryTitle(record: PersonaMemoryRecord): string {
  const fromTitleOrSummary = pickFirstNonEmptyNullableString([record.title, record.summary], '');
  if (fromTitleOrSummary.length > 0) {
    return fromTitleOrSummary;
  }
  return record.content.slice(0, 120);
}

export function formatPersonaMemoryOriginPrimaryLine(record: PersonaMemoryRecord): string {
  return pickFirstNonEmptyNullableString([record.sourceLabel, record.sourceType], '-');
}

export function formatPersonaMemoryOriginSourceTypeLabel(record: PersonaMemoryRecord): string {
  return pickFirstNonEmptyNullableString([record.sourceType], 'unknown');
}

export function hasPersonaMemoryMetadata(
  metadata: PersonaMemoryRecord['metadata']
): metadata is NonNullable<PersonaMemoryRecord['metadata']> {
  return metadata !== undefined;
}

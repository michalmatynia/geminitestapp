import type { ProductValidationPattern, ProductValidationSemanticAuditRecord, ProductValidationSemanticAuditSource, ProductValidationSemanticAuditTrigger, ProductValidationSemanticState } from '@/shared/contracts/products/validation';
import { LATEST_PRODUCT_VALIDATION_SEMANTIC_STATE_VERSION, productValidationSemanticAuditRecordSchema } from '@/shared/contracts/products/validation';
import {
  getProductValidationSemanticOperationUiMetadata,
  inferProductValidationSemanticStateFromPattern,
  migrateProductValidationSemanticOperationIdToLatest,
  migrateProductValidationSemanticPresetIdToLatest,
  type ProductValidationSemanticOperationId,
} from '@/shared/lib/products/utils/validator-semantic-operations';
import { z } from 'zod';

export type ProductValidationSemanticTransition =
  | {
      kind: 'none';
      previous: null;
      current: null;
    }
  | {
      kind: 'recognized';
      previous: null;
      current: ProductValidationSemanticState;
    }
  | {
      kind: 'cleared';
      previous: ProductValidationSemanticState;
      current: null;
    }
  | {
      kind: 'preserved' | 'updated' | 'migrated';
      previous: ProductValidationSemanticState;
      current: ProductValidationSemanticState;
    };

const normalizeRecordedAt = (value: unknown): string | null => {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString();
  }
  return null;
};

const normalizeTagList = (tags: string[] | undefined): string[] | undefined => {
  if (!Array.isArray(tags) || tags.length === 0) return undefined;
  const unique = new Set<string>();
  for (const tag of tags) {
    const normalized = tag.trim();
    if (!normalized) continue;
    unique.add(normalized);
  }
  return unique.size > 0 ? [...unique] : undefined;
};

const sortSerializableValue = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map((item) => sortSerializableValue(item));
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nestedValue]) => [key, sortSerializableValue(nestedValue)])
    );
  }
  return value;
};

const productValidationSemanticStateInputSchema = z.object({
  version: z
    .union([z.literal(1), z.literal(LATEST_PRODUCT_VALIDATION_SEMANTIC_STATE_VERSION)])
    .optional(),
  presetId: z.string().trim().min(1).nullable().optional(),
  operation: z.string().trim().min(1),
  sourceField: z.string().trim().min(1).nullable().optional(),
  targetField: z.string().trim().min(1).nullable().optional(),
  tags: z.array(z.string().trim().min(1)).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const normalizeSemanticMetadata = (
  metadata: Record<string, unknown> | undefined
): Record<string, unknown> | undefined =>
  metadata && Object.keys(metadata).length > 0
    ? (sortSerializableValue(metadata) as Record<string, unknown>)
    : undefined;

export const normalizeProductValidationSemanticState = (
  value: unknown
): ProductValidationSemanticState | null => {
  const parsed = productValidationSemanticStateInputSchema.safeParse(value);
  if (!parsed.success) return null;

  const normalizedOperation = migrateProductValidationSemanticOperationIdToLatest(
    parsed.data.operation
  );
  if (!normalizedOperation) return null;

  const normalizedTags = normalizeTagList(parsed.data.tags);
  const normalizedMetadata = normalizeSemanticMetadata(parsed.data.metadata);

  return {
    version: LATEST_PRODUCT_VALIDATION_SEMANTIC_STATE_VERSION,
    presetId: migrateProductValidationSemanticPresetIdToLatest(parsed.data.presetId) ?? null,
    operation: normalizedOperation,
    sourceField: parsed.data.sourceField?.trim() || null,
    targetField: parsed.data.targetField?.trim() || null,
    ...(normalizedTags ? { tags: normalizedTags } : {}),
    ...(normalizedMetadata ? { metadata: normalizedMetadata } : {}),
  };
};

export const getProductValidationSemanticState = (
  pattern: Partial<
    Pick<
      ProductValidationPattern,
      'semanticState' | 'label' | 'target' | 'regex' | 'replacementEnabled' | 'replacementValue'
    >
  >
): ProductValidationSemanticState | null =>
  normalizeProductValidationSemanticState(pattern.semanticState) ??
  inferProductValidationSemanticStateFromPattern(pattern);

export const resolveProductValidationSemanticStateForPersistence = (
  pattern: Partial<
    Pick<
      ProductValidationPattern,
      'semanticState' | 'label' | 'target' | 'regex' | 'replacementEnabled' | 'replacementValue'
    >
  >
): ProductValidationSemanticState | null => getProductValidationSemanticState(pattern);

export const hasProductValidationSemanticPreset = (
  pattern: Partial<
    Pick<
      ProductValidationPattern,
      'semanticState' | 'label' | 'target' | 'regex' | 'replacementEnabled' | 'replacementValue'
    >
  >,
  presetId: string
): boolean => getProductValidationSemanticState(pattern)?.presetId === presetId;

export const matchesProductValidationSemanticOperation = (
  pattern: Partial<
    Pick<
      ProductValidationPattern,
      'semanticState' | 'label' | 'target' | 'regex' | 'replacementEnabled' | 'replacementValue'
    >
  >,
  matcher: {
    operation: ProductValidationSemanticOperationId | string;
    presetId?: string;
    sourceField?: string;
    targetField?: string;
  }
): boolean => {
  const semanticState = getProductValidationSemanticState(pattern);
  if (!semanticState) return false;
  if (semanticState.operation !== matcher.operation) return false;
  if (matcher.presetId && semanticState.presetId !== matcher.presetId) return false;
  if (
    matcher.sourceField !== undefined &&
    (semanticState.sourceField ?? null) !== matcher.sourceField
  ) {
    return false;
  }
  if (
    matcher.targetField !== undefined &&
    (semanticState.targetField ?? null) !== matcher.targetField
  ) {
    return false;
  }
  return true;
};

export const getProductValidationSemanticTransition = ({
  previous,
  current,
}: {
  previous: unknown;
  current: unknown;
}): ProductValidationSemanticTransition => {
  const normalizedPrevious = normalizeProductValidationSemanticState(previous);
  const normalizedCurrent = normalizeProductValidationSemanticState(current);

  if (!normalizedPrevious && !normalizedCurrent) {
    return { kind: 'none', previous: null, current: null };
  }
  if (!normalizedPrevious && normalizedCurrent) {
    return { kind: 'recognized', previous: null, current: normalizedCurrent };
  }
  if (normalizedPrevious && !normalizedCurrent) {
    return { kind: 'cleared', previous: normalizedPrevious, current: null };
  }

  const prev = normalizedPrevious!;
  const curr = normalizedCurrent!;
  const previousSerialized = serializeProductValidationSemanticState(prev);
  const currentSerialized = serializeProductValidationSemanticState(curr);
  if (previousSerialized === currentSerialized) {
    return {
      kind: 'preserved',
      previous: prev,
      current: curr,
    };
  }
  if (prev.presetId === curr.presetId && prev.operation === curr.operation) {
    return {
      kind: 'updated',
      previous: prev,
      current: curr,
    };
  }
  return {
    kind: 'migrated',
    previous: prev,
    current: curr,
  };
};

export const buildProductValidationSemanticAuditRecord = ({
  previous,
  current,
  source,
  trigger,
  recordedAt,
}: {
  previous: unknown;
  current: unknown;
  source: ProductValidationSemanticAuditSource;
  trigger: ProductValidationSemanticAuditTrigger;
  recordedAt?: string | Date;
}): ProductValidationSemanticAuditRecord => {
  const transition = getProductValidationSemanticTransition({ previous, current });
  return {
    recordedAt: normalizeRecordedAt(recordedAt) ?? new Date().toISOString(),
    source,
    trigger,
    transition: transition.kind,
    previous: transition.previous,
    current: transition.current,
  };
};

export const normalizeProductValidationSemanticAuditRecord = (
  value: unknown
): ProductValidationSemanticAuditRecord | null => {
  const parsed = productValidationSemanticAuditRecordSchema.safeParse(value);
  if (parsed.success) {
    return {
      recordedAt: parsed.data.recordedAt,
      source: parsed.data.source,
      trigger: parsed.data.trigger,
      transition: parsed.data.transition,
      previous: normalizeProductValidationSemanticState(parsed.data.previous),
      current: normalizeProductValidationSemanticState(parsed.data.current),
    };
  }

  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  const previous = normalizeProductValidationSemanticState(record['previous']);
  const current = normalizeProductValidationSemanticState(record['current']);
  const source =
    record['source'] === 'manual_save' || record['source'] === 'import' || record['source'] === 'template'
      ? record['source']
      : null;
  const trigger = record['trigger'] === 'create' || record['trigger'] === 'update' ? record['trigger'] : null;
  const recordedAt = normalizeRecordedAt(record['recordedAt']);
  if (!source || !trigger || !recordedAt) return null;
  return buildProductValidationSemanticAuditRecord({
    previous,
    current,
    source,
    trigger,
    recordedAt,
  });
};

const resolveSemanticOperationTitle = (
  semanticState: ProductValidationSemanticState | null
): string | null => {
  if (!semanticState) return null;
  return (
    getProductValidationSemanticOperationUiMetadata(semanticState.operation)?.title ??
    semanticState.operation
  );
};

export const describeProductValidationSemanticAuditRecord = (value: unknown): string | null => {
  const record = normalizeProductValidationSemanticAuditRecord(value);
  if (!record) return null;

  const previousTitle = resolveSemanticOperationTitle(record.previous);
  const currentTitle = resolveSemanticOperationTitle(record.current);

  switch (record.transition) {
    case 'recognized':
      return currentTitle
        ? `Detected semantic rule "${currentTitle}".`
        : 'Detected semantic metadata.';
    case 'cleared':
      return previousTitle
        ? `Converted from "${previousTitle}" to a generic rule.`
        : 'Converted to a generic rule.';
    case 'updated':
      return currentTitle
        ? `Updated semantic metadata for "${currentTitle}".`
        : 'Updated semantic metadata.';
    case 'migrated':
      if (previousTitle && currentTitle) {
        return `Migrated semantic operation from "${previousTitle}" to "${currentTitle}".`;
      }
      return 'Migrated semantic metadata to a new operation.';
    case 'preserved':
      return currentTitle
        ? `Preserved semantic metadata for "${currentTitle}".`
        : 'Preserved semantic metadata.';
    case 'none':
    default:
      return 'Saved as a generic rule with no semantic metadata.';
  }
};

export const getProductValidationSemanticAuditHistory = (
  pattern: Pick<ProductValidationPattern, 'semanticAudit' | 'semanticAuditHistory'>
): ProductValidationSemanticAuditRecord[] => {
  const entries = [
    ...(pattern.semanticAuditHistory ?? []),
    ...(pattern.semanticAudit ? [pattern.semanticAudit] : []),
  ]
    .map((entry) => normalizeProductValidationSemanticAuditRecord(entry))
    .filter((entry): entry is ProductValidationSemanticAuditRecord => entry !== null);

  const deduped = new Map<string, ProductValidationSemanticAuditRecord>();
  entries.forEach((entry) => {
    const key = [
      entry.recordedAt,
      entry.source,
      entry.trigger,
      entry.transition,
      serializeProductValidationSemanticState(entry.previous),
      serializeProductValidationSemanticState(entry.current),
    ].join('::');
    deduped.set(key, entry);
  });

  return [...deduped.values()].sort((left, right) => right.recordedAt.localeCompare(left.recordedAt));
};

export const getLatestProductValidationSemanticAuditRecord = (
  pattern: Pick<ProductValidationPattern, 'semanticAudit' | 'semanticAuditHistory'>
): ProductValidationSemanticAuditRecord | null =>
  getProductValidationSemanticAuditHistory(pattern)[0] ?? null;

export const getProductValidationSemanticAuditRecordKey = (
  value: ProductValidationSemanticAuditRecord
): string =>
  [
    value.recordedAt,
    value.source,
    value.trigger,
    value.transition,
    serializeProductValidationSemanticState(value.previous),
    serializeProductValidationSemanticState(value.current),
  ].join('::');

export const serializeProductValidationSemanticState = (value: unknown): string =>
  JSON.stringify(normalizeProductValidationSemanticState(value) ?? null);

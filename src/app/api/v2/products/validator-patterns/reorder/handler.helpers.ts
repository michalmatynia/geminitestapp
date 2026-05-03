import type { UpdateProductValidationPatternInput } from '@/shared/contracts/products/validation';
import type { ProductValidationPattern } from '@/shared/contracts/products/validation';
import { conflictError, notFoundError } from '@/shared/errors/app-error';

type ValidatorPatternReorderUpdateLike = {
  id: string;
  sequence?: number;
  sequenceGroupId?: string | null;
  sequenceGroupLabel?: string | null;
  sequenceGroupDebounceMs?: number;
  expectedUpdatedAt?: string | null;
};

export const normalizeValidatorPatternReorderNullableTrimmed = (
  value: string | null | undefined
): string | null | undefined => {
  if (value === undefined) return undefined;
  if (value === null) return null;

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export const assertUniqueValidatorPatternReorderUpdateIds = (
  updates: ValidatorPatternReorderUpdateLike[]
): void => {
  const ids = updates.map((update) => update.id);
  if (new Set(ids).size !== ids.length) {
    throw conflictError('Duplicate pattern IDs in reorder payload.');
  }
};

export const assertFreshValidatorPatternReorderUpdates = (
  updates: ValidatorPatternReorderUpdateLike[],
  currentPatterns: Pick<ProductValidationPattern, 'id' | 'updatedAt'>[]
): void => {
  const currentById = new Map<string, Pick<ProductValidationPattern, 'id' | 'updatedAt'>>(
    currentPatterns.map((pattern) => [pattern.id, pattern])
  );

  for (const update of updates) {
    const current = currentById.get(update.id);
    if (!current) {
      throw notFoundError('Validation pattern not found', { patternId: update.id });
    }

    const expectedUpdatedAt = normalizeValidatorPatternReorderNullableTrimmed(
      update.expectedUpdatedAt
    );
    if (expectedUpdatedAt !== null && expectedUpdatedAt !== undefined && current.updatedAt !== expectedUpdatedAt) {
      throw conflictError('Validation pattern was modified by another request.', {
        patternId: update.id,
        expectedUpdatedAt,
        actualUpdatedAt: current.updatedAt,
      });
    }
  }
};

export const buildValidatorPatternReorderUpdateInput = (
  update: ValidatorPatternReorderUpdateLike
): UpdateProductValidationPatternInput => {
  const input: UpdateProductValidationPatternInput = {
    expectedUpdatedAt: normalizeValidatorPatternReorderNullableTrimmed(
      update.expectedUpdatedAt
    ) ?? null,
  };

  if (update.sequence !== undefined) {
    input.sequence = update.sequence;
  }
  if (update.sequenceGroupId !== undefined) {
    input.sequenceGroupId =
      normalizeValidatorPatternReorderNullableTrimmed(update.sequenceGroupId) ?? null;
  }
  if (update.sequenceGroupLabel !== undefined) {
    input.sequenceGroupLabel =
      normalizeValidatorPatternReorderNullableTrimmed(update.sequenceGroupLabel) ?? null;
  }
  if (update.sequenceGroupDebounceMs !== undefined) {
    input.sequenceGroupDebounceMs = update.sequenceGroupDebounceMs;
  }

  return input;
};

export const buildValidatorPatternReorderResponse = (
  updatedPatterns: ProductValidationPattern[]
): {
  updated: ProductValidationPattern[];
} => ({
  updated: updatedPatterns,
});

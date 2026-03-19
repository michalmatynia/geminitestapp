import type { ProductValidationPattern, SequenceGroupDraft } from '@/shared/contracts/products';
import { logClientError } from '@/shared/utils/observability/client-error-logger';
import { buildSkuAutoIncrementSequenceBundle } from '@/features/products/lib/validatorSemanticPresets';

import { createSequenceGroupId, getPatternSequence } from '../helpers';

import type { CreatePatternMutation } from './types';

export const handleCreateSkuAutoIncrementSequence = async (args: {
  patterns: ProductValidationPattern[];
  orderedPatterns: ProductValidationPattern[];
  setGroupDrafts: (
    updater: (prev: Record<string, SequenceGroupDraft>) => Record<string, SequenceGroupDraft>
  ) => void;
  createPattern: CreatePatternMutation;
  notifySuccess: (message: string) => void;
  notifyError: (message: string) => void;
}): Promise<void> => {
  const { patterns, orderedPatterns, setGroupDrafts, createPattern, notifySuccess, notifyError } =
    args;

  const existingLabels = new Set(
    patterns
      .map((item: ProductValidationPattern) => item.label.trim().toLowerCase())
      .filter((value: string) => value.length > 0)
  );
  const sequenceGroupId = createSequenceGroupId();
  const maxSequence = orderedPatterns.reduce(
    (max: number, pattern: ProductValidationPattern, index: number) =>
      Math.max(max, getPatternSequence(pattern, index)),
    0
  );
  const bundle = buildSkuAutoIncrementSequenceBundle({
    existingLabels,
    sequenceGroupId,
    firstSequence: maxSequence + 10,
  });

  try {
    for (const payload of bundle.patterns) {
      await createPattern.mutateAsync(payload);
    }

    setGroupDrafts((prev: Record<string, SequenceGroupDraft>) => ({
      ...prev,
      [sequenceGroupId]: {
        label: bundle.sequenceGroupLabel,
        debounceMs: String(bundle.sequenceGroupDebounceMs),
      },
    }));
    notifySuccess('SKU auto-increment sequence created.');
  } catch (error) {
    logClientError(error);
    logClientError(error, {
      context: {
        source: 'useValidatorSettingsController',
        action: 'createSkuAutoIncrementSequence',
      },
    });
    notifyError(
      error instanceof Error ? error.message : 'Failed to create SKU auto-increment sequence.'
    );
  }
};

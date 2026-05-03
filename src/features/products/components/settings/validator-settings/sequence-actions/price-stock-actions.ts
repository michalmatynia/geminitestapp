import {
  type CreateValidationPatternPayload,
  type UpdateValidationPatternPayload,
} from '@/features/products/api/settings';
import type { ProductValidationPattern } from '@/shared/contracts/products/validation';
import {
  buildProductValidationSemanticOperationPresetLabel,
  PRODUCT_VALIDATION_SEMANTIC_OPERATION_IDS,
} from '@/shared/lib/products/utils/validator-semantic-operations';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';

import {
  buildUniqueLabel,
  getPatternSequence,
  isLatestFieldMirrorPattern,
} from '../helpers';
import { buildLatestFieldMirrorPatternPayload } from '@/features/products/lib/validatorSemanticPresets';

import type { CreatePatternMutation, UpdatePatternMutation } from './types';

type LatestPriceStockField = 'price' | 'stock';

type UpsertLatestFieldMirrorPatternArgs = {
  field: LatestPriceStockField;
  label: string;
  sequence: number;
  patterns: ProductValidationPattern[];
  createPattern: CreatePatternMutation;
  updatePattern: UpdatePatternMutation;
};

const buildLatestFieldMirrorLabel = (
  field: LatestPriceStockField,
  existingLabels: Set<string>
): string => {
  const fallbackLabel = `${field === 'price' ? 'Price' : 'Stock'} from latest product`;
  return buildUniqueLabel(
    buildProductValidationSemanticOperationPresetLabel(
      PRODUCT_VALIDATION_SEMANTIC_OPERATION_IDS.mirrorLatestField,
      { field }
    ) ?? fallbackLabel,
    existingLabels
  );
};

const upsertLatestFieldMirrorPattern = async ({
  field,
  label,
  sequence,
  patterns,
  createPattern,
  updatePattern,
}: UpsertLatestFieldMirrorPatternArgs): Promise<void> => {
  const patternData: CreateValidationPatternPayload = buildLatestFieldMirrorPatternPayload({
    field,
    label,
    sequence,
  });
  const existingPattern = patterns.find((pattern: ProductValidationPattern) =>
    isLatestFieldMirrorPattern(pattern, field)
  );

  if (existingPattern) {
    const updateData: UpdateValidationPatternPayload = {
      ...patternData,
      label: existingPattern.label,
    };
    await updatePattern.mutateAsync({
      id: existingPattern.id,
      data: updateData,
    });
    return;
  }

  await createPattern.mutateAsync(patternData);
};

export const handleCreateLatestPriceStockSequence = async (args: {
  patterns: ProductValidationPattern[];
  orderedPatterns: ProductValidationPattern[];
  createPattern: CreatePatternMutation;
  updatePattern: UpdatePatternMutation;
  notifySuccess: (message: string) => void;
  notifyError: (message: string) => void;
}): Promise<void> => {
  const { patterns, orderedPatterns, createPattern, updatePattern, notifySuccess, notifyError } =
    args;

  const existingLabels = new Set(
    patterns
      .map((item: ProductValidationPattern) => item.label.trim().toLowerCase())
      .filter((value: string) => value.length > 0)
  );
  const maxSequence = orderedPatterns.reduce(
    (max: number, pattern: ProductValidationPattern, index: number) =>
      Math.max(max, getPatternSequence(pattern, index)),
    0
  );
  const firstSequence = maxSequence + 10;
  const secondSequence = maxSequence + 20;

  const priceLabel = buildLatestFieldMirrorLabel('price', existingLabels);
  existingLabels.add(priceLabel.toLowerCase());
  const stockLabel = buildLatestFieldMirrorLabel('stock', existingLabels);

  try {
    await Promise.all([
      upsertLatestFieldMirrorPattern({
        field: 'price',
        label: priceLabel,
        sequence: firstSequence,
        patterns,
        createPattern,
        updatePattern,
      }),
      upsertLatestFieldMirrorPattern({
        field: 'stock',
        label: stockLabel,
        sequence: secondSequence,
        patterns,
        createPattern,
        updatePattern,
      }),
    ]);

    notifySuccess('Latest price & stock sequence created or updated.');
  } catch (error) {
    logClientCatch(error, {
      source: 'useValidatorSettingsController',
      action: 'createLatestPriceStockSequence',
    });
    notifyError(
      error instanceof Error ? error.message : 'Failed to create latest price & stock sequence.'
    );
  }
};

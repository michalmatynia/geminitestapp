import {
  CreateValidationPatternPayload,
  UpdateValidationPatternPayload,
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

  const priceLabel = buildUniqueLabel(
    buildProductValidationSemanticOperationPresetLabel(
      PRODUCT_VALIDATION_SEMANTIC_OPERATION_IDS.mirrorLatestField,
      { field: 'price' }
    ) ?? 'Price from latest product',
    existingLabels
  );
  existingLabels.add(priceLabel.toLowerCase());
  const stockLabel = buildUniqueLabel(
    buildProductValidationSemanticOperationPresetLabel(
      PRODUCT_VALIDATION_SEMANTIC_OPERATION_IDS.mirrorLatestField,
      { field: 'stock' }
    ) ?? 'Stock from latest product',
    existingLabels
  );

  try {
    const pricePatternData: CreateValidationPatternPayload = buildLatestFieldMirrorPatternPayload({
      field: 'price',
      label: priceLabel,
      sequence: firstSequence,
    });

    const stockPatternData: CreateValidationPatternPayload = buildLatestFieldMirrorPatternPayload({
      field: 'stock',
      label: stockLabel,
      sequence: secondSequence,
    });

    const existingPricePattern = patterns.find((pattern: ProductValidationPattern) =>
      isLatestFieldMirrorPattern(pattern, 'price')
    );
    if (existingPricePattern) {
      const priceUpdateData: UpdateValidationPatternPayload = {
        ...pricePatternData,
        label: existingPricePattern.label,
      };
      await updatePattern.mutateAsync({
        id: existingPricePattern.id,
        data: priceUpdateData,
      });
    } else {
      await createPattern.mutateAsync(pricePatternData);
    }

    const existingStockPattern = patterns.find((pattern: ProductValidationPattern) =>
      isLatestFieldMirrorPattern(pattern, 'stock')
    );
    if (existingStockPattern) {
      const stockUpdateData: UpdateValidationPatternPayload = {
        ...stockPatternData,
        label: existingStockPattern.label,
      };
      await updatePattern.mutateAsync({
        id: existingStockPattern.id,
        data: stockUpdateData,
      });
    } else {
      await createPattern.mutateAsync(stockPatternData);
    }

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

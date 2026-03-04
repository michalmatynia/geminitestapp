import { logClientError } from '@/shared/utils/observability/client-error-logger';
import type { ProductValidationPattern } from '@/shared/contracts/products';
import {
  CreateValidationPatternPayload,
  UpdateValidationPatternPayload,
} from '@/features/products/api/settings';
import {
  buildLatestFieldRecipe,
  buildUniqueLabel,
  getPatternSequence,
  isLatestFieldMirrorPattern,
} from '../helpers';
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

  const priceLabel = buildUniqueLabel('Price from latest product', existingLabels);
  existingLabels.add(priceLabel.toLowerCase());
  const stockLabel = buildUniqueLabel('Stock from latest product', existingLabels);

  try {
    const pricePatternData: CreateValidationPatternPayload = {
      label: priceLabel,
      target: 'price',
      locale: null,
      regex: '^.*$',
      flags: null,
      message:
        'Auto-propose price from the latest created product when current price is empty or 0.',
      severity: 'warning',
      enabled: true,
      replacementEnabled: true,
      replacementAutoApply: false,
      skipNoopReplacementProposal: true,
      replacementValue: buildLatestFieldRecipe('price'),
      replacementFields: ['price'],
      replacementAppliesToScopes: ['draft_template', 'product_create'],
      postAcceptBehavior: 'revalidate',
      validationDebounceMs: 300,
      sequenceGroupId: null,
      sequenceGroupLabel: null,
      sequenceGroupDebounceMs: 0,
      sequence: firstSequence,
      chainMode: 'continue',
      maxExecutions: 1,
      passOutputToNext: false,
      launchEnabled: true,
      launchAppliesToScopes: ['product_create'],
      launchScopeBehavior: 'condition_only',
      launchSourceMode: 'current_field',
      launchSourceField: null,
      launchOperator: 'regex',
      launchValue: '^\\s*(?:0+)?\\s*$',
      launchFlags: null,
      appliesToScopes: ['draft_template', 'product_create'],
    };

    const stockPatternData: CreateValidationPatternPayload = {
      label: stockLabel,
      target: 'stock',
      locale: null,
      regex: '^.*$',
      flags: null,
      message:
        'Auto-propose stock from the latest created product when current stock is empty or 0.',
      severity: 'warning',
      enabled: true,
      replacementEnabled: true,
      replacementAutoApply: false,
      skipNoopReplacementProposal: true,
      replacementValue: buildLatestFieldRecipe('stock'),
      replacementFields: ['stock'],
      replacementAppliesToScopes: ['draft_template', 'product_create'],
      postAcceptBehavior: 'revalidate',
      validationDebounceMs: 300,
      sequenceGroupId: null,
      sequenceGroupLabel: null,
      sequenceGroupDebounceMs: 0,
      sequence: secondSequence,
      chainMode: 'continue',
      maxExecutions: 1,
      passOutputToNext: false,
      launchEnabled: true,
      launchAppliesToScopes: ['product_create'],
      launchScopeBehavior: 'condition_only',
      launchSourceMode: 'current_field',
      launchSourceField: null,
      launchOperator: 'regex',
      launchValue: '^\\s*(?:0+)?\\s*$',
      launchFlags: null,
      appliesToScopes: ['draft_template', 'product_create'],
    };

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
    logClientError(error, {
      context: {
        source: 'useValidatorSettingsController',
        action: 'createLatestPriceStockSequence',
      },
    });
    notifyError(
      error instanceof Error ? error.message : 'Failed to create latest price & stock sequence.'
    );
  }
};

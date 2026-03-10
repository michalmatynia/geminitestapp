import type { ProductValidationPattern, SequenceGroupDraft } from '@/shared/contracts/products';
import { encodeDynamicReplacementRecipe } from '@/shared/lib/products/utils/validator-replacement-recipe';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

import { buildUniqueLabel, createSequenceGroupId, getPatternSequence } from '../helpers';

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
  const sequenceGroupLabel = 'SKU Auto Increment';
  const maxSequence = orderedPatterns.reduce(
    (max: number, pattern: ProductValidationPattern, index: number) =>
      Math.max(max, getPatternSequence(pattern, index)),
    0
  );
  const firstSequence = maxSequence + 10;
  const secondSequence = maxSequence + 20;

  const autoLabel = buildUniqueLabel('SKU Auto Increment (Latest Product)', existingLabels);
  existingLabels.add(autoLabel.toLowerCase());
  const guardLabel = buildUniqueLabel('SKU Auto Increment Guard', existingLabels);

  const replacementRecipe = encodeDynamicReplacementRecipe({
    version: 1,
    sourceMode: 'latest_product_field',
    sourceField: 'sku',
    sourceRegex: '(\\d+)$',
    sourceFlags: null,
    sourceMatchGroup: 1,
    mathOperation: 'add',
    mathOperand: 1,
    roundMode: 'none',
    padLength: 3,
    padChar: '0',
    logicOperator: 'none',
    logicOperand: null,
    logicFlags: null,
    logicWhenTrueAction: 'keep',
    logicWhenTrueValue: null,
    logicWhenFalseAction: 'keep',
    logicWhenFalseValue: null,
    resultAssembly: 'source_replace_match',
    targetApply: 'replace_whole_field',
  });

  try {
    await createPattern.mutateAsync({
      label: autoLabel,
      target: 'sku',
      locale: null,
      regex: '^KEYCHA000$',
      flags: null,
      message: 'Auto-generated SKU proposal from the latest product SKU sequence.',
      severity: 'warning',
      enabled: true,
      replacementEnabled: true,
      replacementAutoApply: true,
      replacementValue: replacementRecipe,
      replacementFields: ['sku'],
      postAcceptBehavior: 'revalidate',
      validationDebounceMs: 300,
      sequenceGroupId,
      sequenceGroupLabel,
      sequenceGroupDebounceMs: 300,
      sequence: firstSequence,
      chainMode: 'stop_on_replace',
      maxExecutions: 1,
      passOutputToNext: true,
      launchEnabled: true,
      launchAppliesToScopes: ['draft_template', 'product_create'],
      launchSourceMode: 'current_field',
      launchSourceField: null,
      launchOperator: 'equals',
      launchValue: 'KEYCHA000',
      launchFlags: null,
    });

    await createPattern.mutateAsync({
      label: guardLabel,
      target: 'sku',
      locale: null,
      regex: '^KEYCHA000$',
      flags: null,
      message: 'SKU is still KEYCHA000. Check latest product SKU format or set SKU manually.',
      severity: 'error',
      enabled: true,
      replacementEnabled: false,
      replacementAutoApply: false,
      replacementValue: null,
      replacementFields: ['sku'],
      postAcceptBehavior: 'revalidate',
      validationDebounceMs: 300,
      sequenceGroupId,
      sequenceGroupLabel,
      sequenceGroupDebounceMs: 300,
      sequence: secondSequence,
      chainMode: 'continue',
      maxExecutions: 1,
      passOutputToNext: false,
      launchEnabled: true,
      launchAppliesToScopes: ['draft_template', 'product_create'],
      launchSourceMode: 'current_field',
      launchSourceField: null,
      launchOperator: 'equals',
      launchValue: 'KEYCHA000',
      launchFlags: null,
    });

    setGroupDrafts((prev: Record<string, SequenceGroupDraft>) => ({
      ...prev,
      [sequenceGroupId]: {
        label: sequenceGroupLabel,
        debounceMs: '300',
      },
    }));
    notifySuccess('SKU auto-increment sequence created.');
  } catch (error) {
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

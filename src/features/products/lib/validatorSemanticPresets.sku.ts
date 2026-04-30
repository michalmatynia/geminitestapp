import type { CreateProductValidationPatternInput } from '@/shared/contracts/products/validation';
import { PRODUCT_SKU_AUTO_INCREMENT_PLACEHOLDER } from '@/shared/lib/products/constants';
import { encodeDynamicReplacementRecipe } from '@/shared/lib/products/utils/validator-replacement-recipe';
import {
  buildProductValidationSemanticOperationPresetLabel,
  buildProductValidationSemanticOperationPresetMessage,
  PRODUCT_VALIDATION_SEMANTIC_OPERATION_IDS,
} from '@/shared/lib/products/utils/validator-semantic-operations';

import {
  buildSkuAutoIncrementGuardSemanticState,
  buildSkuAutoIncrementLatestSemanticState,
  buildUniquePresetLabel,
  SKU_AUTO_INCREMENT_GROUP_LABEL,
  type ValidatorSemanticSequenceBundle,
} from './validatorSemanticPresets.shared';

const buildSkuAutoIncrementRecipe = (): string =>
  encodeDynamicReplacementRecipe({
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

const resolveSkuAutoIncrementLabels = (
  existingLabels: Set<string>
): { autoLabel: string; guardLabel: string } => {
  const labels = new Set(existingLabels);
  return {
    autoLabel: buildUniquePresetLabel(
      buildProductValidationSemanticOperationPresetLabel(
        PRODUCT_VALIDATION_SEMANTIC_OPERATION_IDS.incrementLatestSkuSuffix
      ) ?? 'SKU Auto Increment (Latest Product)',
      labels
    ),
    guardLabel: buildUniquePresetLabel(
      buildProductValidationSemanticOperationPresetLabel(
        PRODUCT_VALIDATION_SEMANTIC_OPERATION_IDS.guardPlaceholderSku
      ) ?? 'SKU Auto Increment Guard',
      labels
    ),
  };
};

const buildSkuAutoIncrementPatternPayload = (input: {
  label: string;
  sequenceGroupId: string;
  sequence: number;
}): CreateProductValidationPatternInput => ({
  label: input.label,
  target: 'sku',
  locale: null,
  regex: `^${PRODUCT_SKU_AUTO_INCREMENT_PLACEHOLDER}$`,
  flags: null,
  message:
    buildProductValidationSemanticOperationPresetMessage(
      PRODUCT_VALIDATION_SEMANTIC_OPERATION_IDS.incrementLatestSkuSuffix
    ) ?? 'Auto-generated SKU proposal from the latest product SKU sequence.',
  severity: 'warning',
  enabled: true,
  replacementEnabled: true,
  replacementAutoApply: true,
  replacementValue: buildSkuAutoIncrementRecipe(),
  replacementFields: ['sku'],
  postAcceptBehavior: 'revalidate',
  validationDebounceMs: 300,
  sequenceGroupId: input.sequenceGroupId,
  sequenceGroupLabel: SKU_AUTO_INCREMENT_GROUP_LABEL,
  sequenceGroupDebounceMs: 300,
  sequence: input.sequence,
  chainMode: 'stop_on_replace',
  maxExecutions: 1,
  passOutputToNext: true,
  launchEnabled: true,
  launchAppliesToScopes: ['draft_template', 'product_create'],
  launchSourceMode: 'current_field',
  launchSourceField: null,
  launchOperator: 'equals',
  launchValue: PRODUCT_SKU_AUTO_INCREMENT_PLACEHOLDER,
  launchFlags: null,
  semanticState: buildSkuAutoIncrementLatestSemanticState(),
});

const buildSkuAutoIncrementGuardPayload = (input: {
  label: string;
  sequenceGroupId: string;
  sequence: number;
}): CreateProductValidationPatternInput => ({
  label: input.label,
  target: 'sku',
  locale: null,
  regex: `^${PRODUCT_SKU_AUTO_INCREMENT_PLACEHOLDER}$`,
  flags: null,
  message:
    buildProductValidationSemanticOperationPresetMessage(
      PRODUCT_VALIDATION_SEMANTIC_OPERATION_IDS.guardPlaceholderSku,
      { placeholder: PRODUCT_SKU_AUTO_INCREMENT_PLACEHOLDER }
    ) ??
    `SKU is still ${PRODUCT_SKU_AUTO_INCREMENT_PLACEHOLDER}. Check latest product SKU format or set SKU manually.`,
  severity: 'error',
  enabled: true,
  replacementEnabled: false,
  replacementAutoApply: false,
  replacementValue: null,
  replacementFields: ['sku'],
  postAcceptBehavior: 'revalidate',
  validationDebounceMs: 300,
  sequenceGroupId: input.sequenceGroupId,
  sequenceGroupLabel: SKU_AUTO_INCREMENT_GROUP_LABEL,
  sequenceGroupDebounceMs: 300,
  sequence: input.sequence,
  chainMode: 'continue',
  maxExecutions: 1,
  passOutputToNext: false,
  launchEnabled: true,
  launchAppliesToScopes: ['draft_template', 'product_create'],
  launchSourceMode: 'current_field',
  launchSourceField: null,
  launchOperator: 'equals',
  launchValue: PRODUCT_SKU_AUTO_INCREMENT_PLACEHOLDER,
  launchFlags: null,
  semanticState: buildSkuAutoIncrementGuardSemanticState(),
});

export const buildSkuAutoIncrementSequenceBundle = ({
  existingLabels,
  sequenceGroupId,
  firstSequence,
}: {
  existingLabels: Set<string>;
  sequenceGroupId: string;
  firstSequence: number;
}): ValidatorSemanticSequenceBundle => {
  const { autoLabel, guardLabel } = resolveSkuAutoIncrementLabels(existingLabels);
  return {
    sequenceGroupId,
    sequenceGroupLabel: SKU_AUTO_INCREMENT_GROUP_LABEL,
    sequenceGroupDebounceMs: 300,
    patterns: [
      buildSkuAutoIncrementPatternPayload({
        label: autoLabel,
        sequenceGroupId,
        sequence: firstSequence,
      }),
      buildSkuAutoIncrementGuardPayload({
        label: guardLabel,
        sequenceGroupId,
        sequence: firstSequence + 10,
      }),
    ],
  };
};

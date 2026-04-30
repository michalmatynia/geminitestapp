import type { CreateProductValidationPatternInput } from '@/shared/contracts/products/validation';
import { encodeDynamicReplacementRecipe } from '@/shared/lib/products/utils/validator-replacement-recipe';
import {
  buildProductValidationSemanticOperationPresetMessage,
  PRODUCT_VALIDATION_SEMANTIC_OPERATION_IDS,
} from '@/shared/lib/products/utils/validator-semantic-operations';

import { buildLatestFieldMirrorSemanticState } from './validatorSemanticPresets.shared';

const buildLatestFieldMirrorRecipe = (field: 'price' | 'stock'): string =>
  encodeDynamicReplacementRecipe({
    version: 1,
    sourceMode: 'latest_product_field',
    sourceField: field,
    sourceRegex: null,
    sourceFlags: null,
    sourceMatchGroup: null,
    mathOperation: 'none',
    mathOperand: null,
    roundMode: 'none',
    padLength: null,
    padChar: null,
    logicOperator: 'none',
    logicOperand: null,
    logicFlags: null,
    logicWhenTrueAction: 'keep',
    logicWhenTrueValue: null,
    logicWhenFalseAction: 'keep',
    logicWhenFalseValue: null,
    resultAssembly: 'segment_only',
    targetApply: 'replace_whole_field',
  });

const buildLatestFieldMirrorMessage = (field: 'price' | 'stock'): string =>
  buildProductValidationSemanticOperationPresetMessage(
    PRODUCT_VALIDATION_SEMANTIC_OPERATION_IDS.mirrorLatestField,
    { field }
  ) ??
  (field === 'price'
    ? 'Auto-propose price from the latest created product when current price is empty or 0.'
    : 'Auto-propose stock from the latest created product when current stock is empty or 0.');

export const buildLatestFieldMirrorPatternPayload = ({
  field,
  label,
  sequence,
}: {
  field: 'price' | 'stock';
  label: string;
  sequence: number;
}): CreateProductValidationPatternInput => ({
  label,
  target: field,
  locale: null,
  regex: '^.*$',
  flags: null,
  message: buildLatestFieldMirrorMessage(field),
  severity: 'warning',
  enabled: true,
  replacementEnabled: true,
  replacementAutoApply: false,
  skipNoopReplacementProposal: true,
  replacementValue: buildLatestFieldMirrorRecipe(field),
  replacementFields: [field],
  replacementAppliesToScopes: ['draft_template', 'product_create'],
  postAcceptBehavior: 'revalidate',
  validationDebounceMs: 300,
  sequenceGroupId: null,
  sequenceGroupLabel: null,
  sequenceGroupDebounceMs: 0,
  sequence,
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
  semanticState: buildLatestFieldMirrorSemanticState(field),
});

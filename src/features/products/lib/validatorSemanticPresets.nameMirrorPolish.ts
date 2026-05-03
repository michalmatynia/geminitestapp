import type { CreateProductValidationPatternInput } from '@/shared/contracts/products/validation';
import { encodeDynamicReplacementRecipe } from '@/shared/lib/products/utils/validator-replacement-recipe';
import {
  buildProductValidationSemanticOperationPresetLabel,
  buildProductValidationSemanticOperationPresetMessage,
  PRODUCT_VALIDATION_SEMANTIC_OPERATION_IDS,
} from '@/shared/lib/products/utils/validator-semantic-operations';

import {
  buildNameMirrorPolishBaseSemanticState,
  buildNameMirrorPolishTranslationSemanticState,
  buildUniquePresetLabel,
  NAME_MIRROR_POLISH_GROUP_LABEL,
  POLISH_NAME_MIRROR_CATEGORY_MAPPINGS,
  type PolishNameMirrorCategoryMapping,
  type ValidatorSemanticSequenceBundle,
} from './validatorSemanticPresets.shared';

const buildNameMirrorPolishBaseRecipe = (): string =>
  encodeDynamicReplacementRecipe({
    version: 1,
    sourceMode: 'form_field',
    sourceField: 'name_en',
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

const resolveNameMirrorPolishBaseLabel = (): string =>
  buildProductValidationSemanticOperationPresetLabel(
    PRODUCT_VALIDATION_SEMANTIC_OPERATION_IDS.mirrorNameLocale,
    { sourceLocale: 'EN', targetLocale: 'PL' }
  ) ?? 'Mirror Name EN to Name PL';

const buildNameMirrorPolishBasePayload = (input: {
  label: string;
  sequenceGroupId: string;
  sequence: number;
}): CreateProductValidationPatternInput => ({
  label: input.label,
  target: 'name',
  locale: 'pl',
  regex: '^.*$',
  flags: null,
  message:
    buildProductValidationSemanticOperationPresetMessage(
      PRODUCT_VALIDATION_SEMANTIC_OPERATION_IDS.mirrorNameLocale,
      { sourceLocale: 'English', targetLocale: 'Polish' }
    ) ?? 'Mirror English name into Polish name before running Polish replacement rules.',
  severity: 'warning',
  enabled: true,
  replacementEnabled: true,
  replacementAutoApply: true,
  replacementValue: buildNameMirrorPolishBaseRecipe(),
  replacementFields: ['name_pl'],
  postAcceptBehavior: 'revalidate',
  validationDebounceMs: 300,
  sequenceGroupId: input.sequenceGroupId,
  sequenceGroupLabel: NAME_MIRROR_POLISH_GROUP_LABEL,
  sequenceGroupDebounceMs: 300,
  sequence: input.sequence,
  chainMode: 'continue',
  maxExecutions: 1,
  passOutputToNext: true,
  launchEnabled: true,
  launchSourceMode: 'form_field',
  launchSourceField: 'name_en',
  launchOperator: 'is_not_empty',
  launchValue: null,
  launchFlags: null,
  semanticState: buildNameMirrorPolishBaseSemanticState(),
});

const resolveNameMirrorPolishTranslationLabel = (
  mapping: PolishNameMirrorCategoryMapping
): string =>
  buildProductValidationSemanticOperationPresetLabel(
    PRODUCT_VALIDATION_SEMANTIC_OPERATION_IDS.translateNameToken,
    {
      targetLocale: 'PL',
      sourceLabel: mapping.sourceLabel,
      replacement: mapping.replacement,
    }
  ) ?? `Name PL: ${mapping.sourceLabel} -> ${mapping.replacement}`;

const buildNameMirrorPolishTranslationPayload = (input: {
  label: string;
  mapping: PolishNameMirrorCategoryMapping;
  sequenceGroupId: string;
  sequence: number;
}): CreateProductValidationPatternInput => ({
  label: input.label,
  target: 'name',
  locale: 'pl',
  regex: input.mapping.sourceRegex,
  flags: 'gi',
  message:
    buildProductValidationSemanticOperationPresetMessage(
      PRODUCT_VALIDATION_SEMANTIC_OPERATION_IDS.translateNameToken,
      {
        targetLocale: 'Polish',
        sourceLabel: input.mapping.sourceLabel,
        replacement: input.mapping.replacement,
      }
    ) ??
    `Replace "${input.mapping.sourceLabel}" with "${input.mapping.replacement}" in Polish name.`,
  severity: 'warning',
  enabled: true,
  replacementEnabled: true,
  replacementAutoApply: true,
  replacementValue: input.mapping.replacement,
  replacementFields: ['name_pl'],
  postAcceptBehavior: 'revalidate',
  validationDebounceMs: 300,
  sequenceGroupId: input.sequenceGroupId,
  sequenceGroupLabel: NAME_MIRROR_POLISH_GROUP_LABEL,
  sequenceGroupDebounceMs: 300,
  sequence: input.sequence,
  chainMode: 'continue',
  maxExecutions: 1,
  passOutputToNext: true,
  launchEnabled: true,
  launchSourceMode: 'form_field',
  launchSourceField: 'name_pl',
  launchOperator: 'is_not_empty',
  launchValue: null,
  launchFlags: null,
  semanticState: buildNameMirrorPolishTranslationSemanticState(input.mapping),
});

const appendNameMirrorPolishBasePattern = (input: {
  labels: Set<string>;
  patterns: CreateProductValidationPatternInput[];
  sequenceGroupId: string;
  firstSequence: number;
}): void => {
  const mirrorBaseLabel = resolveNameMirrorPolishBaseLabel();
  if (input.labels.has(mirrorBaseLabel.toLowerCase())) return;
  input.patterns.push(
    buildNameMirrorPolishBasePayload({
      label: buildUniquePresetLabel(mirrorBaseLabel, input.labels),
      sequenceGroupId: input.sequenceGroupId,
      sequence: input.firstSequence,
    })
  );
};

const appendNameMirrorPolishTranslationPatterns = (input: {
  labels: Set<string>;
  patterns: CreateProductValidationPatternInput[];
  sequenceGroupId: string;
  firstSequence: number;
}): void => {
  let offset = 1;
  for (const mapping of POLISH_NAME_MIRROR_CATEGORY_MAPPINGS) {
    const baseLabel = resolveNameMirrorPolishTranslationLabel(mapping);
    if (!input.labels.has(baseLabel.toLowerCase())) {
      input.patterns.push(
        buildNameMirrorPolishTranslationPayload({
          label: buildUniquePresetLabel(baseLabel, input.labels),
          mapping,
          sequenceGroupId: input.sequenceGroupId,
          sequence: input.firstSequence + offset * 5,
        })
      );
      offset += 1;
    }
  }
};

export const buildNameMirrorPolishSequenceBundle = ({
  existingLabels,
  sequenceGroupId,
  firstSequence,
}: {
  existingLabels: Set<string>;
  sequenceGroupId: string;
  firstSequence: number;
}): ValidatorSemanticSequenceBundle => {
  const labels = new Set(existingLabels);
  const patterns: CreateProductValidationPatternInput[] = [];
  appendNameMirrorPolishBasePattern({ labels, patterns, sequenceGroupId, firstSequence });
  appendNameMirrorPolishTranslationPatterns({ labels, patterns, sequenceGroupId, firstSequence });

  return {
    sequenceGroupId,
    sequenceGroupLabel: NAME_MIRROR_POLISH_GROUP_LABEL,
    sequenceGroupDebounceMs: 300,
    patterns,
  };
};

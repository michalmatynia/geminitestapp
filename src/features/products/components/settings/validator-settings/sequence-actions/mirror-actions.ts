 
 
 
 
 
 

import { logClientError } from '@/shared/utils/observability/client-error-logger';
import { encodeDynamicReplacementRecipe } from '@/shared/lib/products/utils/validator-replacement-recipe';
import type { 
  ProductValidationPattern, 
} from '@/shared/contracts/products';
import { 
  CreateValidationPatternPayload, 
} from '@/features/products/api/settings';
import { api } from '@/shared/lib/api-client';
import { invalidateValidatorConfig } from '@/shared/lib/query-invalidation';
import type { QueryClient } from '@tanstack/react-query';
import {
  buildUniqueLabel,
  createSequenceGroupId,
  getPatternSequence,
  isNameSecondSegmentDimensionPattern,
} from '../helpers';
import type { CreatePatternMutation, UpdatePatternMutation } from './types';

export const createNameSecondSegmentDimensionPattern = async (args: {
  target: 'size_length' | 'length';
  labelBase: string;
  message: string;
  replacementField: 'sizeLength' | 'length';
  sequence: number;
  patterns: ProductValidationPattern[];
  updatePattern: UpdatePatternMutation;
  createPattern: CreatePatternMutation;
}): Promise<void> => {
  const { target, labelBase, message, replacementField, sequence, patterns, updatePattern, createPattern } = args;
  const existingLabels = new Set(
    patterns
      .map((item: ProductValidationPattern) => item.label.trim().toLowerCase())
      .filter((value: string) => value.length > 0)
  );
  const label = buildUniqueLabel(labelBase, existingLabels);

  const replacementRecipe = encodeDynamicReplacementRecipe({
    version: 1,
    sourceMode: 'form_field',
    sourceField: 'name_en',
    sourceRegex: '^\\s*[^|]+\\|\\s*([0-9]+(?:[.,][0-9]+)?)',
    sourceFlags: 'i',
    sourceMatchGroup: 1,
    mathOperation: 'none',
    mathOperand: null,
    roundMode: 'none',
    padLength: null,
    padChar: null,
    logicOperator: 'regex',
    logicOperand: '^[0-9]+(?:[.,][0-9]+)?$',
    logicFlags: null,
    logicWhenTrueAction: 'keep',
    logicWhenTrueValue: null,
    logicWhenFalseAction: 'abort',
    logicWhenFalseValue: null,
    resultAssembly: 'segment_only',
    targetApply: 'replace_whole_field',
  });

  const payload: CreateValidationPatternPayload = {
    label,
    target,
    locale: null,
    regex: '^.*$',
    flags: null,
    message,
    severity: 'warning',
    enabled: true,
    replacementEnabled: true,
    replacementAutoApply: false,
    skipNoopReplacementProposal: true,
    replacementValue: replacementRecipe,
    replacementFields: [replacementField],
    replacementAppliesToScopes: ['draft_template', 'product_create', 'product_edit'],
    postAcceptBehavior: 'revalidate',
    validationDebounceMs: 250,
    sequenceGroupId: null,
    sequenceGroupLabel: null,
    sequenceGroupDebounceMs: 0,
    sequence,
    chainMode: 'continue',
    maxExecutions: 1,
    passOutputToNext: false,
    launchEnabled: true,
    launchAppliesToScopes: ['draft_template', 'product_create', 'product_edit'],
    launchScopeBehavior: 'gate',
    launchSourceMode: 'form_field',
    launchSourceField: 'name_en',
    launchOperator: 'regex',
    launchValue:
      '^\\s*[^|]+\\s*\\|\\s*[^|]+\\s*\\|\\s*[^|]+\\s*\\|\\s*[^|]+\\s*\\|\\s*[^|]+\\s*$',
    launchFlags: null,
    appliesToScopes: ['draft_template', 'product_create', 'product_edit'],
  };

  const existing = patterns.find((pattern: ProductValidationPattern) =>
    isNameSecondSegmentDimensionPattern(pattern, target)
  );
  if (existing) {
    await updatePattern.mutateAsync({
      id: existing.id,
      data: {
        ...payload,
        label: existing.label,
      },
    });
  } else {
    await createPattern.mutateAsync(payload);
  }
};

export const handleCreateNameLengthMirrorPattern = async (args: {
  patterns: ProductValidationPattern[];
  orderedPatterns: ProductValidationPattern[];
  queryClient: QueryClient;
  notifySuccess: (message: string) => void;
  notifyError: (message: string) => void;
  notifyInfo: (message: string) => void;
  updatePattern: UpdatePatternMutation;
  createPattern: CreatePatternMutation;
}): Promise<void> => {
  const { patterns, orderedPatterns, queryClient, notifySuccess, notifyError, notifyInfo, updatePattern, createPattern } = args;
  try {
    const templateResult = await api.post<{
      outcomes?: Array<{
        action?: string;
        target?: string;
      }>;
    }>(
      '/api/products/validator-patterns/templates/name-segment-dimensions',
      {},
      { logError: false }
    );
    void invalidateValidatorConfig(queryClient);
    const createdCount = (templateResult.outcomes ?? []).filter(
      (item) => item.action === 'created'
    ).length;
    notifySuccess('Name segment -> Length & Height patterns created or updated.');
    if (createdCount > 0) {
      notifyInfo(
        createdCount === 1
          ? '1 new pattern was created from the template.'
          : `${createdCount} new patterns were created from the template.`
      );
    }
  } catch (error) {
    try {
      const maxSequence = orderedPatterns.reduce(
        (max: number, pattern: ProductValidationPattern, index: number) =>
          Math.max(max, getPatternSequence(pattern, index)),
        0
      );
      await createNameSecondSegmentDimensionPattern({
        target: 'size_length',
        labelBase: 'Name Segment #2 -> Length',
        message:
          'Propose Length (sizeLength) from Name segment #2 (between first and second "|").',
        replacementField: 'sizeLength',
        sequence: maxSequence + 10,
        patterns,
        updatePattern,
        createPattern,
      });
      await createNameSecondSegmentDimensionPattern({
        target: 'length',
        labelBase: 'Name Segment #2 -> Height',
        message: 'Propose Height (length) from Name segment #2 (between first and second "|").',
        replacementField: 'length',
        sequence: maxSequence + 20,
        patterns,
        updatePattern,
        createPattern,
      });
      notifySuccess('Name segment -> Length & Height patterns created or updated.');
    } catch (fallbackError) {
      logClientError(fallbackError, {
        context: {
          source: 'useValidatorSettingsController',
          action: 'createNameLengthMirrorPattern',
        },
      });
      notifyError(
        fallbackError instanceof Error
          ? fallbackError.message
          : error instanceof Error
            ? error.message
            : 'Failed to create name segment dimension patterns.'
      );
    }
  }
};

export const handleCreateNameCategoryMirrorPattern = async (args: {
  queryClient: QueryClient;
  notifySuccess: (message: string) => void;
  notifyError: (message: string) => void;
  notifyInfo: (message: string) => void;
}): Promise<void> => {
  const { queryClient, notifySuccess, notifyError, notifyInfo } = args;
  try {
    const templateResult = await api.post<{
      outcomes?: Array<{
        action?: string;
        target?: string;
      }>;
    }>(
      '/api/products/validator-patterns/templates/name-segment-category',
      {},
      { logError: false }
    );
    void invalidateValidatorConfig(queryClient);
    const createdCount = (templateResult.outcomes ?? []).filter(
      (item) => item.action === 'created'
    ).length;
    notifySuccess('Name segment -> Category pattern created or updated.');
    if (createdCount > 0) {
      notifyInfo(
        createdCount === 1
          ? '1 new pattern was created from the template.'
          : `${createdCount} new patterns were created from the template.`
      );
    }
  } catch (error) {
    logClientError(error, {
      context: {
        source: 'useValidatorSettingsController',
        action: 'createNameCategoryMirrorPattern',
      },
    });
    notifyError(
      error instanceof Error ? error.message : 'Failed to create name segment category pattern.'
    );
  }
};

export const handleCreateNameMirrorPolishSequence = async (args: {
  patterns: ProductValidationPattern[];
  orderedPatterns: ProductValidationPattern[];
  createPattern: CreatePatternMutation;
  notifySuccess: (message: string) => void;
  notifyError: (message: string) => void;
}): Promise<void> => {
  const { patterns, orderedPatterns, createPattern, notifySuccess, notifyError } = args;
  const existingLabels = new Set(
    patterns
      .map((item: ProductValidationPattern) => item.label.trim().toLowerCase())
      .filter((value: string) => value.length > 0)
  );
  const sequenceGroupId = createSequenceGroupId();
  const sequenceGroupLabel = 'Name EN -> PL Mirror';
  const categoryNameMappings: Array<{
    sourceLabel: string;
    sourceRegex: string;
    replacement: string;
  }> = [
    {
      sourceLabel: 'Keychain',
      sourceRegex: 'Keychain',
      replacement: 'Brelok',
    },
    {
      sourceLabel: 'Pin',
      sourceRegex: '\\bPin\\b',
      replacement: 'Przypinka',
    },
    {
      sourceLabel: 'Pendant',
      sourceRegex: '\\bPendant\\b',
      replacement: 'Zawieszka',
    },
    {
      sourceLabel: 'Ring',
      sourceRegex: '\\bRing\\b',
      replacement: 'Pierścień',
    },
    {
      sourceLabel: 'Earrings',
      sourceRegex: '\\bEarrings\\b',
      replacement: 'Kolczyki',
    },
    {
      sourceLabel: 'Figurine',
      sourceRegex: '\\bFigurine\\b',
      replacement: 'Figurka',
    },
    {
      sourceLabel: 'Cards',
      sourceRegex: '\\bCards\\b',
      replacement: 'Karty',
    },
  ];
  const maxSequence = orderedPatterns.reduce(
    (max: number, pattern: ProductValidationPattern, index: number) =>
      Math.max(max, getPatternSequence(pattern, index)),
    0
  );
  const firstSequence = maxSequence + 10;

  const mirrorBaseLabel = 'Mirror Name EN to Name PL';
  const shouldCreateMirrorPattern = !existingLabels.has(mirrorBaseLabel.toLowerCase());
  const mirrorLabel = shouldCreateMirrorPattern
    ? buildUniqueLabel(mirrorBaseLabel, existingLabels)
    : mirrorBaseLabel;
  if (shouldCreateMirrorPattern) {
    existingLabels.add(mirrorLabel.toLowerCase());
  }

  const categoryMappingsToCreate = categoryNameMappings.filter((mapping) => {
    const baseLabel = `Name PL: ${mapping.sourceLabel} -> ${mapping.replacement}`.toLowerCase();
    return !existingLabels.has(baseLabel);
  });

  const categoryMappingLabels = categoryMappingsToCreate.map((mapping) => {
    const label = buildUniqueLabel(
      `Name PL: ${mapping.sourceLabel} -> ${mapping.replacement}`,
      existingLabels
    );
    existingLabels.add(label.toLowerCase());
    return label;
  });

  const mirrorRecipe = encodeDynamicReplacementRecipe({
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

  try {
    if (shouldCreateMirrorPattern) {
      await createPattern.mutateAsync({
        label: mirrorLabel,
        target: 'name',
        locale: 'pl',
        regex: '^.*$',
        flags: null,
        message: 'Mirror English name into Polish name before running Polish replacement rules.',
        severity: 'warning',
        enabled: true,
        replacementEnabled: true,
        replacementAutoApply: true,
        replacementValue: mirrorRecipe,
        replacementFields: ['name_pl'],
        postAcceptBehavior: 'revalidate',
        validationDebounceMs: 300,
        sequenceGroupId,
        sequenceGroupLabel,
        sequenceGroupDebounceMs: 300,
        sequence: firstSequence,
        chainMode: 'continue',
        maxExecutions: 1,
        passOutputToNext: true,
        launchEnabled: true,
        launchSourceMode: 'form_field',
        launchSourceField: 'name_en',
        launchOperator: 'is_not_empty',
        launchValue: null,
        launchFlags: null,
      });
    }

    for (let index = 0; index < categoryMappingsToCreate.length; index += 1) {
      const mapping = categoryMappingsToCreate[index];
      if (!mapping) continue;
      const label = categoryMappingLabels[index];
      if (!label) continue;

      await createPattern.mutateAsync({
        label,
        target: 'name',
        locale: 'pl',
        regex: mapping.sourceRegex,
        flags: 'gi',
        message: `Replace "${mapping.sourceLabel}" with "${mapping.replacement}" in Polish name.`,
        severity: 'warning',
        enabled: true,
        replacementEnabled: true,
        replacementAutoApply: true,
        replacementValue: mapping.replacement,
        replacementFields: ['name_pl'],
        postAcceptBehavior: 'revalidate',
        validationDebounceMs: 300,
        sequenceGroupId,
        sequenceGroupLabel,
        sequenceGroupDebounceMs: 300,
        sequence: firstSequence + (index + 1) * 5,
        chainMode: 'continue',
        maxExecutions: 1,
        passOutputToNext: true,
        launchEnabled: true,
        launchSourceMode: 'form_field',
        launchSourceField: 'name_pl',
        launchOperator: 'is_not_empty',
        launchValue: null,
        launchFlags: null,
      });
    }

    notifySuccess('English -> Polish name mirror sequence created.');
  } catch (error) {
    logClientError(error, {
      context: {
        source: 'useValidatorSettingsController',
        action: 'createNameMirrorPolishSequence',
      },
    });
    notifyError(
      error instanceof Error ? error.message : 'Failed to create name mirror sequence.'
    );
  }
};

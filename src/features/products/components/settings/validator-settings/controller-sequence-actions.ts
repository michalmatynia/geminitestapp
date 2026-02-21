import { logClientError } from '@/features/observability';
import type {
  CreateValidationPatternPayload,
  UpdateValidationPatternPayload,
} from '@/features/products/api/settings';
import {
  encodeDynamicReplacementRecipe,
} from '@/features/products/utils/validator-replacement-recipe';
import type { ProductValidationPattern } from '@/shared/contracts/products';
import type { SequenceGroupDraft } from '@/shared/contracts/products';
import { api } from '@/shared/lib/api-client';

import {
  buildLatestFieldRecipe,
  buildUniqueLabel,
  createSequenceGroupId,
  getPatternSequence,
  isLatestFieldMirrorPattern,
  isNameSecondSegmentDimensionPattern,
} from './helpers';


export type CreatePatternMutation = {
  mutateAsync: (payload: CreateValidationPatternPayload) => Promise<unknown>;
};

export type UpdatePatternMutation = {
  mutateAsync: (payload: { id: string; data: UpdateValidationPatternPayload }) => Promise<unknown>;
};

type SequenceGroup = {
  id: string;
  label: string;
  debounceMs: number;
  patternIds: string[];
};

type SequenceActionInput = {
  patterns: ProductValidationPattern[];
  orderedPatterns: ProductValidationPattern[];
  sequenceGroups: Map<string, SequenceGroup>;
  getGroupDraft: (groupId: string) => SequenceGroupDraft;
  setGroupDrafts: (
    updater: (prev: Record<string, SequenceGroupDraft>) => Record<string, SequenceGroupDraft>
  ) => void;
  createPattern: CreatePatternMutation;
  updatePattern: UpdatePatternMutation;
  invalidateConfig: () => Promise<void>;
  notifySuccess: (message: string) => void;
  notifyError: (message: string) => void;
  notifyInfo: (message: string) => void;
};

type SequenceActionResult = {
  handleCreateSkuAutoIncrementSequence: () => Promise<void>;
  handleCreateLatestPriceStockSequence: () => Promise<void>;
  handleCreateNameLengthMirrorPattern: () => Promise<void>;
  handleCreateNameCategoryMirrorPattern: () => Promise<void>;
  handleCreateNameMirrorPolishSequence: () => Promise<void>;
  handleSaveSequenceGroup: (groupId: string) => Promise<void>;
  handleUngroup: (groupId: string) => Promise<void>;
  handleMoveGroup: (groupId: string, targetIndex: number) => Promise<void>;
  handleReorderInGroup: (patternId: string, targetIndex: number) => Promise<void>;
  handleMoveToGroup: (patternId: string, groupId: string) => Promise<void>;
  handleRemoveFromGroup: (patternId: string) => Promise<void>;
  handleCreateGroup: (patternIds: string[]) => Promise<void>;
  handleRenameGroup: (groupId: string, label: string) => Promise<void>;
  handleUpdateGroupDebounce: (groupId: string, debounceMs: number) => Promise<void>;
};

/**
 * Validator docs: see docs/validator/function-reference.md#controller.createsequenceactions
 */
export function createSequenceActions(args: SequenceActionInput): SequenceActionResult {
  const {
    patterns,
    orderedPatterns,
    sequenceGroups,
    getGroupDraft,
    setGroupDrafts,
    createPattern,
    updatePattern,
    invalidateConfig,
    notifySuccess,
    notifyError,
    notifyInfo,
  } = args;
  const handleCreateSkuAutoIncrementSequence = async (): Promise<void> => {
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
        error instanceof Error
          ? error.message
          : 'Failed to create SKU auto-increment sequence.'
      );
    }
  };

  const handleCreateLatestPriceStockSequence = async (): Promise<void> => {
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
        error instanceof Error
          ? error.message
          : 'Failed to create latest price & stock sequence.'
      );
    }
  };

  const createNameSecondSegmentDimensionPattern = async ({
    target,
    labelBase,
    message,
    replacementField,
    sequence,
  }: {
    target: 'size_length' | 'length';
    labelBase: string;
    message: string;
    replacementField: 'sizeLength' | 'length';
    sequence: number;
  }): Promise<void> => {
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

  const handleCreateNameLengthMirrorPattern = async (): Promise<void> => {
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
      await invalidateConfig();
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
        });
        await createNameSecondSegmentDimensionPattern({
          target: 'length',
          labelBase: 'Name Segment #2 -> Height',
          message:
            'Propose Height (length) from Name segment #2 (between first and second "|").',
          replacementField: 'length',
          sequence: maxSequence + 20,
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

  const handleCreateNameCategoryMirrorPattern = async (): Promise<void> => {
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
      await invalidateConfig();
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
        error instanceof Error
          ? error.message
          : 'Failed to create name segment category pattern.'
      );
    }
  };

  const handleCreateNameMirrorPolishSequence = async (): Promise<void> => {
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
    const shouldCreateMirrorPattern = !existingLabels.has(
      mirrorBaseLabel.toLowerCase()
    );
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
          message:
            'Mirror English name into Polish name before running Polish replacement rules.',
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
        const isLast = index === categoryMappingsToCreate.length - 1;

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
          sequenceGroupDebounceMs: 0,
          sequence: firstSequence + (index + 1) * 10,
          chainMode: 'continue',
          maxExecutions: 3,
          passOutputToNext: !isLast,
          launchEnabled: false,
          launchSourceMode: 'current_field',
          launchSourceField: null,
          launchOperator: 'equals',
          launchValue: null,
          launchFlags: null,
        });
      }

      setGroupDrafts((prev: Record<string, SequenceGroupDraft>) => ({
        ...prev,
        [sequenceGroupId]: {
          label: sequenceGroupLabel,
          debounceMs: '0',
        },
      }));
      notifySuccess('Name EN -> PL mirror sequence created.');
    } catch (error) {
      logClientError(error, {
        context: {
          source: 'useValidatorSettingsController',
          action: 'createNameMirrorPolishSequence',
        },
      });
      notifyError(
        error instanceof Error
          ? error.message
          : 'Failed to create Name EN -> PL mirror sequence.'
      );
    }
  };

  const handleSaveSequenceGroup = async (groupId: string): Promise<void> => {
    const group = args.sequenceGroups.get(groupId);
    if (!group || group.patternIds.length === 0) return;
    /* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
    const draft = args.getGroupDraft(groupId);
    const label = draft.label.trim() || 'Sequence / Group';
    const parsedDebounce = Number(draft.debounceMs);
    const debounceMs = Number.isFinite(parsedDebounce)
      ? Math.min(30_000, Math.max(0, Math.floor(parsedDebounce)))
      : 0;
    try {
      for (const patternId of group.patternIds) {
        await args.updatePattern.mutateAsync({
          id: patternId,
          data: {
            sequenceGroupId: groupId,
            sequenceGroupLabel: label,
            sequenceGroupDebounceMs: debounceMs,
          },
        });
      }
      args.setGroupDrafts((prev: Record<string, SequenceGroupDraft>) => ({
        ...prev,
        [groupId]: { label, debounceMs: String(debounceMs) },
      }));
      /* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
      notifySuccess('Sequence group settings saved.');
    } catch (error) {
      logClientError(error, {
        context: {
          source: 'useValidatorSettingsController',
          action: 'saveSequenceGroup',
          groupId,
        },
      });
      notifyError(
        error instanceof Error ? error.message : 'Failed to save sequence group.'
      );
    }
  };

  const handleUngroup = async (groupId: string): Promise<void> => {
    const group = sequenceGroups.get(groupId);
    if (!group || group.patternIds.length === 0) return;
    try {
      for (const patternId of group.patternIds) {
        await updatePattern.mutateAsync({
          id: patternId,
          data: {
            sequenceGroupId: null,
            sequenceGroupLabel: null,
            sequenceGroupDebounceMs: 0,
          },
        });
      }
      setGroupDrafts((prev: Record<string, SequenceGroupDraft>) => {
        const next = { ...prev };
        delete next[groupId];
        return next;
      });
      notifySuccess('Sequence group removed.');
    } catch (error) {
      logClientError(error, {
        context: {
          source: 'useValidatorSettingsController',
          action: 'ungroupSequence',
          groupId,
        },
      });
      notifyError(
        error instanceof Error ? error.message : 'Failed to ungroup sequence.'
      );
    }
  };

  const handleUpdateGroupDebounce = async (groupId: string, debounceMs: number): Promise<void> => {
    const group = sequenceGroups.get(groupId);
    if (!group) return;
    try {
      for (const patternId of group.patternIds) {
        await updatePattern.mutateAsync({
          id: patternId,
          data: { sequenceGroupDebounceMs: debounceMs },
        });
      }
      setGroupDrafts((prev) => ({
        ...prev,
        [groupId]: { ...getGroupDraft(groupId), debounceMs: String(debounceMs) },
      }));
    } catch (error) {
      logClientError(error, { context: { source: 'controller-sequence-actions', action: 'updateGroupDebounce', groupId } });
      notifyError('Failed to update group debounce.');
    }
  };

  const handleMoveGroup = async (_groupId: string, _targetIndex: number): Promise<void> => {
    // Reorder all patterns such that this group moves to targetIndex
    notifyInfo('Moving group...');
  };

  const handleReorderInGroup = async (_patternId: string, _targetIndex: number): Promise<void> => {
    notifyInfo('Reordering in group...');
  };

  const handleMoveToGroup = async (patternId: string, groupId: string): Promise<void> => {
    const group = sequenceGroups.get(groupId);
    if (!group) return;
    try {
      await updatePattern.mutateAsync({
        id: patternId,
        data: {
          sequenceGroupId: groupId,
          sequenceGroupLabel: group.label,
          sequenceGroupDebounceMs: group.debounceMs,
        },
      });
      notifySuccess('Moved to group.');
    } catch (error) {
      logClientError(error, { context: { source: 'controller-sequence-actions', action: 'moveToGroup', patternId, groupId } });
      notifyError('Failed to move to group.');
    }
  };

  const handleRemoveFromGroup = async (patternId: string): Promise<void> => {
    try {
      await updatePattern.mutateAsync({
        id: patternId,
        data: {
          sequenceGroupId: null,
          sequenceGroupLabel: null,
          sequenceGroupDebounceMs: 0,
        },
      });
      notifySuccess('Removed from group.');
    } catch (error) {
      logClientError(error, { context: { source: 'controller-sequence-actions', action: 'removeFromGroup', patternId } });
      notifyError('Failed to remove from group.');
    }
  };

  const handleCreateGroup = async (patternIds: string[]): Promise<void> => {
    const groupId = createSequenceGroupId();
    const label = 'New Group';
    try {
      for (const patternId of patternIds) {
        await updatePattern.mutateAsync({
          id: patternId,
          data: {
            sequenceGroupId: groupId,
            sequenceGroupLabel: label,
            sequenceGroupDebounceMs: 300,
          },
        });
      }
      notifySuccess('Group created.');
    } catch (error) {
      logClientError(error, { context: { source: 'controller-sequence-actions', action: 'createGroup', patternIds } });
      notifyError('Failed to create group.');
    }
  };

  const handleRenameGroup = async (groupId: string, label: string): Promise<void> => {
    const group = sequenceGroups.get(groupId);
    if (!group) return;
    try {
      for (const patternId of group.patternIds) {
        await updatePattern.mutateAsync({
          id: patternId,
          data: { sequenceGroupLabel: label },
        });
      }
      setGroupDrafts((prev) => ({
        ...prev,
        [groupId]: { ...getGroupDraft(groupId), label },
      }));
      notifySuccess('Group renamed.');
    } catch (error) {
      logClientError(error, { context: { source: 'controller-sequence-actions', action: 'renameGroup', groupId } });
      notifyError('Failed to rename group.');
    }
  };

  return {
    handleCreateSkuAutoIncrementSequence,
    handleCreateLatestPriceStockSequence,
    handleCreateNameLengthMirrorPattern,
    handleCreateNameCategoryMirrorPattern,
    handleCreateNameMirrorPolishSequence,
    handleSaveSequenceGroup,
    handleUngroup,
    handleMoveGroup,
    handleReorderInGroup,
    handleMoveToGroup,
    handleRemoveFromGroup,
    handleCreateGroup,
    handleRenameGroup,
    handleUpdateGroupDebounce,
  };
}

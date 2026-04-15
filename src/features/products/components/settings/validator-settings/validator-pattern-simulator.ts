// Validator pattern simulator: UI logic for running validator patterns locally
// in the admin settings. This module wires the simulator input shapes to the
// validation engine, normalizes patterns, and guards against unsafe replacement
// executions in the browser.
import type { DynamicReplacementSourceMode, ProductValidationInstanceScope, ProductValidationPattern, ProductValidationSemanticState } from '@/shared/contracts/products/validation';
import type { PatternFormData, SequenceGroupView, ValidatorPatternSimulatorInput } from '@/shared/contracts/products/drafts';
import type { ProductCategory } from '@/shared/contracts/products/categories';
import {
  isPatternEnabledForValidationScope,
  isPatternReplacementEnabledForValidationScope,
} from '@/shared/lib/products/utils/validator-instance-behavior';
import { encodeDynamicReplacementRecipe } from '@/shared/lib/products/utils/validator-replacement-recipe';
import {
  allowsPatternExecutionWithoutRegexMatch,
  applyResolvedReplacement,
  isPatternLocaleMatch,
  isReplacementAllowedForField,
  normalizePatternChainMode,
  normalizePatternMaxExecutions,
  resolveFieldTargetAndLocale,
  sortValidatorPatterns,
  resolvePatternReplacementValue,
  shouldLaunchPattern,
} from '@/features/products/validation-engine/core';
import { applyValidatorFieldReplacement } from '@/features/products/lib/applyValidatorFieldReplacement';
import {
  PRODUCT_VALIDATION_REPLACEMENT_FIELD_LABELS,
  PRODUCT_VALIDATION_SOURCE_FIELD_OPTIONS,
  buildProductValidationSourceValues,
} from '@/features/products/lib/validatorSourceFields';
import { getReplacementFieldsForProductValidationTarget } from '@/features/products/lib/validatorTargetAdapters';

import { buildValidationPayload, parseStrictInt } from './controller-diff-utils';
import { buildDynamicRecipeFromForm, canCompileRegex } from './helpers';

export type ValidatorPatternSimulationResult = {
  status: 'invalid' | 'ready';
  error: string | null;
  fieldName: string;
  fieldLabel: string;
  validationScope: ProductValidationInstanceScope;
  patternEnabledForScope: boolean;
  replacementEnabledForScope: boolean;
  launchMatched: boolean;
  regexMatched: boolean;
  allowWithoutRegexMatch: boolean;
  replacementValue: string | null;
  applied: boolean;
  outputValue: string | number | null;
  outputDisplayValue: string | null;
  notes: string[];
  sequenceTrace: ValidatorPatternSequenceTraceStep[];
  sequenceGroupLabel: string | null;
};

export type ValidatorPatternSequenceTraceStep = {
  patternId: string;
  label: string;
  sequence: number | null;
  isPreviewPattern: boolean;
  inputValue: string;
  outputValue: string;
  launchMatched: boolean;
  regexMatched: boolean;
  allowWithoutRegexMatch: boolean;
  replacementEnabledForScope: boolean;
  replacementValue: string | null;
  executions: number;
  applied: boolean;
  skipReason:
    | 'disabled'
    | 'out_of_scope'
    | 'launch_blocked'
    | 'regex_no_match'
    | 'replacement_disabled'
    | 'replacement_unresolved'
    | null;
  stopReason:
    | 'chain_stop_on_match'
    | 'chain_stop_on_replace'
    | 'pass_output_disabled'
    | null;
};

const SOURCE_FIELD_LABEL_MAP = new Map(
  PRODUCT_VALIDATION_SOURCE_FIELD_OPTIONS.map((option) => [option.value, option.label])
);

const DEFAULT_SCOPE: ProductValidationInstanceScope = 'product_edit';

const resolveSimulatorFieldName = (target: string, locale: string): string => {
  if (target === 'name' || target === 'description') {
    const normalizedLocale = locale.trim().toLowerCase() || 'en';
    return `${target}_${normalizedLocale}`;
  }
  return getReplacementFieldsForProductValidationTarget(target)[0] ?? 'sku';
};

const getFieldLabel = (fieldName: string): string =>
  SOURCE_FIELD_LABEL_MAP.get(fieldName) ??
  PRODUCT_VALIDATION_REPLACEMENT_FIELD_LABELS[fieldName] ??
  fieldName;

const makeSimulatorInputKey = (sourceMode: DynamicReplacementSourceMode, fieldName: string): string =>
  `${sourceMode}:${fieldName}`;

export const buildValidatorPatternSimulatorInputs = (
  formData: PatternFormData
): ValidatorPatternSimulatorInput[] => {
  const currentFieldName = resolveSimulatorFieldName(formData.target, formData.locale);
  const inputs: ValidatorPatternSimulatorInput[] = [
    {
      key: makeSimulatorInputKey('current_field', currentFieldName),
      fieldName: currentFieldName,
      sourceMode: 'current_field',
      label: `Current ${getFieldLabel(currentFieldName)}`,
      placeholder: 'Current field value',
    },
  ];
  const seen = new Set<string>([makeSimulatorInputKey('current_field', currentFieldName)]);

  const addInput = (sourceMode: DynamicReplacementSourceMode, fieldName: string, labelPrefix: string) => {
    const normalizedFieldName = fieldName.trim();
    if (!normalizedFieldName) return;
    if (sourceMode === 'current_field') return;
    if (sourceMode === 'form_field' && normalizedFieldName === currentFieldName) return;
    const key = makeSimulatorInputKey(sourceMode, normalizedFieldName);
    if (seen.has(key)) return;
    seen.add(key);
    inputs.push({
      key,
      fieldName: normalizedFieldName,
      sourceMode,
      label: `${labelPrefix} ${getFieldLabel(normalizedFieldName)}`,
      placeholder:
        sourceMode === 'latest_product_field'
          ? 'Latest product source value'
          : 'Source value',
    });
  };

  addInput(formData.sourceMode, formData.sourceField, 'Source');
  if (formData.launchEnabled) {
    addInput(formData.launchSourceMode, formData.launchSourceField, 'Launch');
  }

  return inputs;
};

const parseCategoryFixtureLine = (line: string, index: number): ProductCategory | null => {
  const parts = line
    .split('|')
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
  if (parts.length === 0) return null;

  const id = parts[0] ?? `sim-category-${index + 1}`;
  const name = parts[1] ?? parts[0] ?? `Category ${index + 1}`;

  return {
    id,
    name,
    name_en: parts[2] ?? name,
    name_pl: parts[3] ?? name,
    name_de: parts[4] ?? name,
    color: null,
    parentId: null,
    catalogId: 'simulator',
    createdAt: '',
    updatedAt: '',
  };
};

export const parseValidatorPatternSimulatorCategoryFixtures = (
  value: string
): ProductCategory[] =>
  value
    .split('\n')
    .map((line, index) => parseCategoryFixtureLine(line.trim(), index))
    .filter((category): category is ProductCategory => category !== null);

const buildPreviewPatternFromFormData = ({
  formData,
  sequenceGroups,
  editingPattern,
  modalSemanticState,
}: {
  formData: PatternFormData;
  sequenceGroups: Map<string, SequenceGroupView>;
  editingPattern: ProductValidationPattern | null;
  modalSemanticState: ProductValidationSemanticState | null;
}):
  | { error: string; pattern: null }
  | {
      error: null;
      pattern: ProductValidationPattern;
    } => {
  if (!formData.regex.trim()) {
    return { error: 'Enter a regex to preview the pattern.', pattern: null };
  }
  if (!canCompileRegex(formData.regex, formData.flags)) {
    return { error: 'Regex is invalid.', pattern: null };
  }

  const parsedSequence =
    formData.sequence.trim().length === 0 ? null : parseStrictInt(formData.sequence);
  if (formData.sequence.trim().length > 0 && (parsedSequence === null || parsedSequence < 0)) {
    return { error: 'Sequence must be a whole number greater than or equal to 0.', pattern: null };
  }

  const parsedMaxExecutions = parseStrictInt(formData.maxExecutions);
  if (parsedMaxExecutions === null || parsedMaxExecutions < 1 || parsedMaxExecutions > 20) {
    return { error: 'Max executions must be a whole number between 1 and 20.', pattern: null };
  }

  const parsedValidationDebounceMs = parseStrictInt(formData.validationDebounceMs);
  if (
    parsedValidationDebounceMs === null ||
    parsedValidationDebounceMs < 0 ||
    parsedValidationDebounceMs > 30_000
  ) {
    return { error: 'Debounce must be a whole number between 0 and 30000.', pattern: null };
  }

  let replacementValue: string | null = null;
  if (formData.replacementMode === 'dynamic') {
    const recipe = buildDynamicRecipeFromForm(formData);
    if (!recipe) {
      return { error: 'Dynamic replacer config is incomplete.', pattern: null };
    }
    replacementValue = encodeDynamicReplacementRecipe(recipe);
  } else {
    replacementValue = formData.replacementValue.length > 0 ? formData.replacementValue : null;
  }

  const payload = buildValidationPayload({
    formData,
    sequenceGroups,
    editingPattern,
    semanticState: modalSemanticState,
    replacementValue,
    parsedSequence,
    parsedMaxExecutions,
    parsedValidationDebounceMs,
  });

  return {
    error: null,
    pattern: {
      id: editingPattern?.id ?? '__preview__',
      createdAt: editingPattern?.createdAt ?? '',
      updatedAt: editingPattern?.updatedAt ?? '',
      label: payload.label ?? '',
      target: payload.target ?? 'name',
      locale: payload.locale ?? null,
      regex: payload.regex ?? '',
      flags: payload.flags ?? null,
      message: payload.message ?? '',
      severity: payload.severity ?? 'warning',
      enabled: payload.enabled ?? true,
      replacementEnabled: payload.replacementEnabled ?? false,
      replacementAutoApply: payload.replacementAutoApply ?? false,
      skipNoopReplacementProposal: payload.skipNoopReplacementProposal ?? true,
      replacementValue: payload.replacementValue ?? null,
      replacementFields: payload.replacementFields ?? [],
      replacementAppliesToScopes: payload.replacementAppliesToScopes ?? [
        'draft_template',
        'product_create',
        'product_edit',
      ],
      runtimeEnabled: payload.runtimeEnabled ?? false,
      runtimeType: payload.runtimeType ?? 'none',
      runtimeConfig: payload.runtimeConfig ?? null,
      postAcceptBehavior: payload.postAcceptBehavior ?? 'revalidate',
      denyBehaviorOverride: payload.denyBehaviorOverride ?? null,
      validationDebounceMs: payload.validationDebounceMs ?? 0,
      sequenceGroupId: payload.sequenceGroupId ?? null,
      sequenceGroupLabel: payload.sequenceGroupLabel ?? null,
      sequenceGroupDebounceMs: payload.sequenceGroupDebounceMs ?? 0,
      sequence: payload.sequence ?? null,
      chainMode: payload.chainMode ?? 'continue',
      maxExecutions: payload.maxExecutions ?? 1,
      passOutputToNext: payload.passOutputToNext ?? true,
      launchEnabled: payload.launchEnabled ?? false,
      launchAppliesToScopes: payload.launchAppliesToScopes ?? [
        'draft_template',
        'product_create',
        'product_edit',
      ],
      launchScopeBehavior: payload.launchScopeBehavior ?? 'gate',
      launchSourceMode: payload.launchSourceMode ?? 'current_field',
      launchSourceField: payload.launchSourceField ?? null,
      launchOperator: payload.launchOperator ?? 'equals',
      launchValue: payload.launchValue ?? null,
      launchFlags: payload.launchFlags ?? null,
      appliesToScopes: payload.appliesToScopes ?? ['draft_template', 'product_create', 'product_edit'],
      semanticState: payload.semanticState ?? null,
    },
  };
};

const buildSequenceTracePatterns = ({
  previewPattern,
  orderedPatterns,
  editingPattern,
  fieldName,
}: {
  previewPattern: ProductValidationPattern;
  orderedPatterns: ProductValidationPattern[];
  editingPattern: ProductValidationPattern | null;
  fieldName: string;
}): ProductValidationPattern[] => {
  const groupId = previewPattern.sequenceGroupId?.trim() ?? '';
  if (!groupId) return [previewPattern];

  const { locale: fieldLocale } = resolveFieldTargetAndLocale(fieldName);
  const filtered = orderedPatterns.filter((pattern) => {
    const patternGroupId = pattern.sequenceGroupId?.trim() ?? '';
    if (patternGroupId !== groupId) return false;
    if (pattern.target !== previewPattern.target) return false;
    if (!isPatternLocaleMatch(pattern.locale ?? null, fieldLocale)) return false;
    return isReplacementAllowedForField(pattern, fieldName);
  });

  const withoutEdited = editingPattern
    ? filtered.filter((pattern) => pattern.id !== editingPattern.id)
    : filtered;

  return sortValidatorPatterns([...withoutEdited, previewPattern]);
};

const buildSequenceTrace = ({
  tracePatterns,
  previewPattern,
  fieldValue,
  validationScope,
  values,
  latestProductValues,
}: {
  tracePatterns: ProductValidationPattern[];
  previewPattern: ProductValidationPattern;
  fieldValue: string;
  validationScope: ProductValidationInstanceScope;
  values: Record<string, unknown>;
  latestProductValues: Record<string, unknown> | null;
}): {
  steps: ValidatorPatternSequenceTraceStep[];
  finalValue: string;
} => {
  const steps: ValidatorPatternSequenceTraceStep[] = [];
  let candidateValue = fieldValue;

  for (const pattern of tracePatterns) {
    const inputValue = candidateValue;
    const patternEnabledForScope =
      pattern.enabled &&
      isPatternEnabledForValidationScope(pattern.appliesToScopes, validationScope);
    const replacementEnabledForScope = isPatternReplacementEnabledForValidationScope(
      pattern.replacementAppliesToScopes,
      validationScope
    );
    const allowWithoutRegexMatch = allowsPatternExecutionWithoutRegexMatch(pattern);

    let launchMatched = false;
    let regexMatched = false;
    let replacementValue: string | null = null;
    let executions = 0;
    let applied = false;
    let outputValue = inputValue;
    let skipReason: ValidatorPatternSequenceTraceStep['skipReason'] = null;
    let stopReason: ValidatorPatternSequenceTraceStep['stopReason'] = null;

    if (!pattern.enabled) {
      skipReason = 'disabled';
    } else if (!patternEnabledForScope) {
      skipReason = 'out_of_scope';
    } else {
      const maxExecutions = normalizePatternMaxExecutions(pattern);
      let matched = false;
      let replaced = false;

      for (let execution = 0; execution < maxExecutions; execution += 1) {
        launchMatched = shouldLaunchPattern({
          pattern,
          validationScope,
          fieldValue: candidateValue,
          values,
          latestProductValues,
        });
        if (!launchMatched) {
          if (executions === 0) skipReason = 'launch_blocked';
          break;
        }

        try {
          regexMatched = new RegExp(pattern.regex, pattern.flags ?? undefined).test(candidateValue);
        } catch {
          regexMatched = false;
        }

        if (!regexMatched && !allowWithoutRegexMatch) {
          if (executions === 0) skipReason = 'regex_no_match';
          break;
        }

        matched = true;
        executions += 1;
        const replacement = replacementEnabledForScope
          ? resolvePatternReplacementValue({
              pattern,
              fieldValue: candidateValue,
              values,
              latestProductValues,
            })
          : null;
        replacementValue = replacement?.value ?? null;

        if (!replacementEnabledForScope) {
          skipReason = 'replacement_disabled';
          break;
        }
        if (!replacement) {
          skipReason = 'replacement_unresolved';
          break;
        }
        const replacedValue = applyResolvedReplacement({
          value: candidateValue,
          pattern,
          replacement,
        });
        outputValue = replacedValue;
        if (replacedValue === candidateValue) {
          break;
        }

        applied = true;
        replaced = true;
        candidateValue = replacedValue;
      }

      const chainMode = normalizePatternChainMode(pattern);
      if (matched && chainMode === 'stop_on_match') {
        stopReason = 'chain_stop_on_match';
      } else if (replaced && chainMode === 'stop_on_replace') {
        stopReason = 'chain_stop_on_replace';
      } else if (replaced && pattern.passOutputToNext === false) {
        stopReason = 'pass_output_disabled';
      }
    }

    steps.push({
      patternId: pattern.id,
      label: pattern.label,
      sequence: pattern.sequence ?? null,
      isPreviewPattern: pattern.id === previewPattern.id,
      inputValue,
      outputValue,
      launchMatched,
      regexMatched,
      allowWithoutRegexMatch,
      replacementEnabledForScope,
      replacementValue,
      executions,
      applied,
      skipReason,
      stopReason,
    });

    if (stopReason) break;
  }

  return {
    steps,
    finalValue: candidateValue,
  };
};

const buildCategoryNameById = (categories: ProductCategory[]): Map<string, string> =>
  new Map(
    categories
      .map((category) => [category.id, category.name] as const)
      .filter(([id, name]) => Boolean(id) && Boolean(name))
  );

const toStringValue = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return '';
};

export const simulateValidatorPatternPreview = ({
  pattern,
  formData,
  validationScope = DEFAULT_SCOPE,
  simulatorValues,
  categoryFixturesText,
}: {
  pattern: ProductValidationPattern;
  formData: PatternFormData;
  validationScope?: ProductValidationInstanceScope;
  simulatorValues: Record<string, string>;
  categoryFixturesText: string;
}): ValidatorPatternSimulationResult => {
  const currentFieldName = resolveSimulatorFieldName(formData.target, formData.locale);
  const currentFieldLabel = getFieldLabel(currentFieldName);
  const currentFieldKey = makeSimulatorInputKey('current_field', currentFieldName);
  const currentFieldValue = simulatorValues[currentFieldKey] ?? '';
  const categories = parseValidatorPatternSimulatorCategoryFixtures(categoryFixturesText);
  const categoryNameById = buildCategoryNameById(categories);
  const descriptors = buildValidatorPatternSimulatorInputs(formData);

  const rawFormValues: Record<string, unknown> = {
    [currentFieldName]: currentFieldValue,
  };
  const latestProductValues: Record<string, unknown> = {};

  for (const descriptor of descriptors) {
    const inputValue = simulatorValues[descriptor.key] ?? '';
    if (descriptor.sourceMode === 'latest_product_field') {
      latestProductValues[descriptor.fieldName] = inputValue;
      continue;
    }
    rawFormValues[descriptor.fieldName] = inputValue;
  }

  const values = {
    ...buildProductValidationSourceValues({
      baseValues: rawFormValues,
      categories,
      selectedCategoryId:
        currentFieldName === 'categoryId' ? currentFieldValue : toStringValue(rawFormValues['categoryId']),
      selectedCatalogIds: [],
      fallbackCatalogId: 'simulator',
    }),
    ...Object.fromEntries(
      descriptors
        .filter((descriptor) => descriptor.sourceMode === 'form_field')
        .map((descriptor) => [descriptor.fieldName, simulatorValues[descriptor.key] ?? ''])
    ),
  };

  const notes: string[] = [];
  const patternEnabledForScope = isPatternEnabledForValidationScope(
    pattern.appliesToScopes,
    validationScope
  );
  const replacementEnabledForScope = isPatternReplacementEnabledForValidationScope(
    pattern.replacementAppliesToScopes,
    validationScope
  );
  const allowWithoutRegexMatch = allowsPatternExecutionWithoutRegexMatch(pattern);

  let regexMatched = false;
  try {
    regexMatched = new RegExp(pattern.regex, pattern.flags ?? undefined).test(currentFieldValue);
  } catch (error) {
    return {
      status: 'invalid',
      error: error instanceof Error ? error.message : 'Invalid regular expression.',
      fieldName: currentFieldName,
      fieldLabel: currentFieldLabel,
      validationScope,
      patternEnabledForScope,
      replacementEnabledForScope,
      launchMatched: false,
      regexMatched: false,
      allowWithoutRegexMatch,
      replacementValue: null,
      applied: false,
      outputValue: null,
      outputDisplayValue: null,
      notes,
      sequenceTrace: [],
      sequenceGroupLabel: null,
    };
  }

  if (!patternEnabledForScope) {
    notes.push(`Pattern is disabled for ${validationScope}.`);
  }
  if (!replacementEnabledForScope) {
    notes.push(`Replacement is disabled for ${validationScope}.`);
  }
  if (pattern.runtimeEnabled && pattern.runtimeType !== 'none') {
    notes.push('Runtime replacement preview is not evaluated in the simulator.');
  }
  if (pattern.target === 'category' && categories.length === 0) {
    notes.push('Add category fixtures to preview label-to-category resolution.');
  }

  const launchMatched = shouldLaunchPattern({
    pattern,
    validationScope,
    fieldValue: currentFieldValue,
    values,
    latestProductValues,
  });

  if (!launchMatched) {
    notes.push('Launch conditions did not match.');
  }
  if (!regexMatched && !allowWithoutRegexMatch) {
    notes.push('Regex did not match the current field value.');
  }

  const replacement = launchMatched
    ? resolvePatternReplacementValue({
        pattern,
        fieldValue: currentFieldValue,
        values,
        latestProductValues,
      })
    : null;
  const nextFieldValue =
    launchMatched && replacementEnabledForScope
      ? applyResolvedReplacement({
          value: currentFieldValue,
          pattern,
          replacement,
        })
      : currentFieldValue;

  const simulatedCurrentValues: Record<string, unknown> = {
    ...values,
    [currentFieldName]: currentFieldValue,
  };
  let appliedOutputValue: string | number | null = toStringValue(
    simulatedCurrentValues[currentFieldName]
  );
  let appliedOutputDisplayValue: string | null =
    currentFieldName === 'categoryId'
      ? (categoryNameById.get(toStringValue(simulatedCurrentValues[currentFieldName])) ??
          toStringValue(simulatedCurrentValues[currentFieldName])) ||
        null
      : toStringValue(simulatedCurrentValues[currentFieldName]) || null;

  const applied =
    launchMatched &&
    replacementEnabledForScope &&
    (regexMatched || allowWithoutRegexMatch) &&
    applyValidatorFieldReplacement({
      fieldName: currentFieldName,
      replacementValue: nextFieldValue,
      categories,
      categoryNameById,
      getCurrentFieldValue: (fieldName) => simulatedCurrentValues[fieldName],
      setFormFieldValue: (fieldName, value) => {
        simulatedCurrentValues[fieldName] = value;
        appliedOutputValue = typeof value === 'number' ? value : toStringValue(value);
        appliedOutputDisplayValue = toStringValue(value) || null;
      },
      setCategoryId: (categoryId) => {
        simulatedCurrentValues['categoryId'] = categoryId ?? '';
        appliedOutputValue = categoryId ?? null;
        appliedOutputDisplayValue = categoryId
          ? (categoryNameById.get(categoryId) ?? categoryId)
          : null;
      },
    });

  if (launchMatched && replacementEnabledForScope && !applied && pattern.target === 'category') {
    notes.push('Replacement could not be resolved to a category ID.');
  }

  return {
    status: 'ready',
    error: null,
    fieldName: currentFieldName,
    fieldLabel: currentFieldLabel,
    validationScope,
    patternEnabledForScope,
    replacementEnabledForScope,
    launchMatched,
    regexMatched,
    allowWithoutRegexMatch,
    replacementValue: replacement?.value ?? null,
    applied,
    outputValue: appliedOutputValue,
    outputDisplayValue: appliedOutputDisplayValue,
    notes,
    sequenceTrace: [],
    sequenceGroupLabel: pattern.sequenceGroupLabel ?? null,
  };
};

export const buildAndSimulateValidatorPatternPreview = ({
  formData,
  sequenceGroups,
  orderedPatterns,
  editingPattern,
  modalSemanticState,
  validationScope = DEFAULT_SCOPE,
  simulatorValues,
  categoryFixturesText,
}: {
  formData: PatternFormData;
  sequenceGroups: Map<string, SequenceGroupView>;
  orderedPatterns: ProductValidationPattern[];
  editingPattern: ProductValidationPattern | null;
  modalSemanticState: ProductValidationSemanticState | null;
  validationScope?: ProductValidationInstanceScope;
  simulatorValues: Record<string, string>;
  categoryFixturesText: string;
}): ValidatorPatternSimulationResult => {
  const currentFieldName = resolveSimulatorFieldName(formData.target, formData.locale);
  const currentFieldLabel = getFieldLabel(currentFieldName);
  const previewPatternResult = buildPreviewPatternFromFormData({
    formData,
    sequenceGroups,
    editingPattern,
    modalSemanticState,
  });
  if (previewPatternResult.error || !previewPatternResult.pattern) {
    return {
      status: 'invalid',
      error: previewPatternResult.error ?? 'Pattern preview could not be created.',
      fieldName: currentFieldName,
      fieldLabel: currentFieldLabel,
      validationScope,
      patternEnabledForScope: true,
      replacementEnabledForScope: true,
      launchMatched: false,
      regexMatched: false,
      allowWithoutRegexMatch: false,
      replacementValue: null,
      applied: false,
      outputValue: null,
      outputDisplayValue: null,
      notes: [],
      sequenceTrace: [],
      sequenceGroupLabel: null,
    };
  }

  const baseResult = simulateValidatorPatternPreview({
    pattern: previewPatternResult.pattern,
    formData,
    validationScope,
    simulatorValues,
    categoryFixturesText,
  });

  if (baseResult.status !== 'ready') {
    return baseResult;
  }

  const tracePatterns = buildSequenceTracePatterns({
    previewPattern: previewPatternResult.pattern,
    orderedPatterns,
    editingPattern,
    fieldName: baseResult.fieldName,
  });
  const categories = parseValidatorPatternSimulatorCategoryFixtures(categoryFixturesText);
  const descriptors = buildValidatorPatternSimulatorInputs(formData);
  const rawFormValues: Record<string, unknown> = {
    [baseResult.fieldName]: simulatorValues[makeSimulatorInputKey('current_field', baseResult.fieldName)] ?? '',
  };
  const latestProductValues: Record<string, unknown> = {};

  for (const descriptor of descriptors) {
    const inputValue = simulatorValues[descriptor.key] ?? '';
    if (descriptor.sourceMode === 'latest_product_field') {
      latestProductValues[descriptor.fieldName] = inputValue;
      continue;
    }
    rawFormValues[descriptor.fieldName] = inputValue;
  }

  const values = {
    ...buildProductValidationSourceValues({
      baseValues: rawFormValues,
      categories,
      selectedCategoryId:
        baseResult.fieldName === 'categoryId'
          ? (simulatorValues[makeSimulatorInputKey('current_field', baseResult.fieldName)] ?? '')
          : toStringValue(rawFormValues['categoryId']),
      selectedCatalogIds: [],
      fallbackCatalogId: 'simulator',
    }),
    ...Object.fromEntries(
      descriptors
        .filter((descriptor) => descriptor.sourceMode === 'form_field')
        .map((descriptor) => [descriptor.fieldName, simulatorValues[descriptor.key] ?? ''])
    ),
  };

  const trace = buildSequenceTrace({
    tracePatterns,
    previewPattern: previewPatternResult.pattern,
    fieldValue:
      simulatorValues[makeSimulatorInputKey('current_field', baseResult.fieldName)] ?? '',
    validationScope,
    values,
    latestProductValues,
  });

  const categoryNameById = buildCategoryNameById(categories);
  const simulatedCurrentValues: Record<string, unknown> = {
    ...values,
    [baseResult.fieldName]:
      simulatorValues[makeSimulatorInputKey('current_field', baseResult.fieldName)] ?? '',
  };
  let traceOutputValue: string | number | null = toStringValue(
    simulatedCurrentValues[baseResult.fieldName]
  );
  let traceOutputDisplayValue: string | null =
    baseResult.fieldName === 'categoryId'
      ? (categoryNameById.get(toStringValue(simulatedCurrentValues[baseResult.fieldName])) ??
          toStringValue(simulatedCurrentValues[baseResult.fieldName])) ||
        null
      : toStringValue(simulatedCurrentValues[baseResult.fieldName]) || null;

  const traceApplied = applyValidatorFieldReplacement({
    fieldName: baseResult.fieldName,
    replacementValue: trace.finalValue,
    categories,
    categoryNameById,
    getCurrentFieldValue: (fieldName) => simulatedCurrentValues[fieldName],
    setFormFieldValue: (fieldName, value) => {
      simulatedCurrentValues[fieldName] = value;
      traceOutputValue = typeof value === 'number' ? value : toStringValue(value);
      traceOutputDisplayValue = toStringValue(value) || null;
    },
    setCategoryId: (categoryId) => {
      simulatedCurrentValues['categoryId'] = categoryId ?? '';
      traceOutputValue = categoryId ?? null;
      traceOutputDisplayValue = categoryId
        ? (categoryNameById.get(categoryId) ?? categoryId)
        : null;
    },
  });

  return {
    ...baseResult,
    applied: traceApplied,
    outputValue: traceOutputValue,
    outputDisplayValue: traceOutputDisplayValue,
    sequenceTrace: trace.steps,
    sequenceGroupLabel: previewPatternResult.pattern.sequenceGroupLabel ?? null,
  };
};

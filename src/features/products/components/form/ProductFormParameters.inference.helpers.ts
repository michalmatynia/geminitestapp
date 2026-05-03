import type { AiTriggerButtonRecord } from '@/shared/contracts/ai-trigger-buttons';
import type { ProductParameter } from '@/shared/contracts/products/parameters';
import type { ProductParameterValue } from '@/shared/contracts/products/product';
import {
  PARAMETER_VALUE_INFERENCE_PATH_ID,
  PARAMETER_VALUE_INFERENCE_TRIGGER_BUTTON_ID,
  PARAMETER_VALUE_INFERENCE_TRIGGER_LOCATION,
  PARAMETER_VALUE_INFERENCE_TRIGGER_NAME,
  PARAMETER_VALUE_INFERENCE_TRIGGER_SORT_INDEX,
} from '@/shared/lib/ai-paths/parameter-value-inference';

import {
  formatChecklistValues,
  parseChecklistValues,
  readNonEmptyString,
  trimString,
} from './ProductFormParameters.labels';
import type {
  CatalogLanguageOption,
  ParameterValueInferenceRunRow,
  ParameterValueSnapshotUpdate,
  ParameterValueRowsSnapshot,
} from './ProductFormParameters.types';

type ProductParameterOptionSource = Omit<ProductParameter, 'optionLabels' | 'selectorType'> &
  Partial<Pick<ProductParameter, 'optionLabels' | 'selectorType'>>;

const ROW_TRIGGER_LANGUAGE_CODES = new Set(['en', 'pl']);

export const SELECTOR_TYPES_REQUIRING_OPTIONS = new Set<ProductParameter['selectorType']>([
  'radio',
  'select',
  'dropdown',
  'checklist',
]);

export const FALLBACK_PARAMETER_VALUE_INFERENCE_BUTTON: AiTriggerButtonRecord = {
  id: PARAMETER_VALUE_INFERENCE_TRIGGER_BUTTON_ID,
  name: PARAMETER_VALUE_INFERENCE_TRIGGER_NAME,
  pathId: PARAMETER_VALUE_INFERENCE_PATH_ID,
  locations: [PARAMETER_VALUE_INFERENCE_TRIGGER_LOCATION],
  mode: 'click',
  display: {
    label: PARAMETER_VALUE_INFERENCE_TRIGGER_NAME,
    showLabel: true,
  },
  enabled: true,
  sortIndex: PARAMETER_VALUE_INFERENCE_TRIGGER_SORT_INDEX,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

export const resolveParameterValueLaunchErrorMessage = (payload: {
  error?: string | null | undefined;
  message?: string | null | undefined;
}): string => {
  const explicitMessage = trimString(payload.message);
  if (explicitMessage.length > 0) {
    return explicitMessage.startsWith('Parameter inference failed:')
      ? explicitMessage
      : `Parameter inference failed: ${explicitMessage}`;
  }

  switch (payload.error) {
    case 'preferred_path_missing':
      return 'Parameter inference failed: the configured AI Path is missing.';
    case 'trigger_node_not_found':
      return 'Parameter inference failed: the selected AI Path no longer contains the trigger node.';
    case 'path_disabled':
      return 'Parameter inference failed: all AI Paths for this trigger are disabled.';
    case 'ambiguous_path_selection':
      return 'Parameter inference failed: multiple active AI Paths match this trigger.';
    case 'no_path_configured':
      return 'Parameter inference failed: no AI Path is configured for this trigger.';
    default:
      return 'Parameter inference failed: unable to start the AI Path run.';
  }
};

export const resolveParameterValueInferenceErrorMessage = (error: unknown): string => {
  if (error instanceof Error && error.message.trim().length > 0) return error.message;
  const stringError = readNonEmptyString(error);
  return stringError ?? 'Parameter inference failed: unexpected error.';
};

export const resolveRawLaunchErrorMessage = (launchError: unknown): string | null => {
  if (typeof launchError === 'string') return launchError;
  return launchError instanceof Error ? launchError.message : null;
};

export const findAllowedOptionLabel = (
  value: string,
  optionLabels: string[]
): string | null => {
  const normalized = value.trim().toLowerCase();
  if (normalized.length === 0) return null;
  return optionLabels.find((optionLabel: string): boolean =>
    optionLabel.trim().toLowerCase() === normalized
  ) ?? null;
};

const normalizeCheckboxInferenceValue = (
  trimmedValue: string,
  optionLabels: string[]
): string | null => {
  if (trimmedValue.length === 0) return '';
  const matchedOption = findAllowedOptionLabel(trimmedValue, optionLabels);
  if (matchedOption !== null) return matchedOption;
  const normalized = trimmedValue.toLowerCase();
  if (['false', '0', 'no', 'off', 'none', 'unknown', 'unsupported'].includes(normalized)) {
    return '';
  }
  if (['true', '1', 'yes', 'on'].includes(normalized)) return optionLabels[0] ?? 'true';
  return optionLabels.length === 0 ? trimmedValue : null;
};

const normalizeChecklistInferenceValue = (
  trimmedValue: string,
  optionLabels: string[]
): string | null => {
  if (trimmedValue.length === 0) return '';
  const inferredValues = parseChecklistValues(trimmedValue);
  if (optionLabels.length === 0) return formatChecklistValues(inferredValues);
  const normalizedValues = inferredValues
    .map((value: string): string | null => findAllowedOptionLabel(value, optionLabels))
    .filter((value: string | null): value is string => value !== null);
  return normalizedValues.length === 0
    ? null
    : formatChecklistValues(Array.from(new Set(normalizedValues)));
};

const normalizeOptionInferenceValue = (
  trimmedValue: string,
  optionLabels: string[]
): string | null => {
  if (trimmedValue.length === 0) return '';
  const matchedOption = findAllowedOptionLabel(trimmedValue, optionLabels);
  if (matchedOption !== null) return matchedOption;
  return optionLabels.length === 0 ? trimmedValue : null;
};

export const normalizeInferredParameterValue = (args: {
  value: string;
  selectorType: ProductParameter['selectorType'];
  optionLabels: string[];
}): string | null => {
  const trimmedValue = args.value.trim();
  const optionLabels = args.optionLabels
    .map((optionLabel: string): string => optionLabel.trim())
    .filter((optionLabel: string): boolean => optionLabel.length > 0);
  if (args.selectorType === 'checkbox') {
    return normalizeCheckboxInferenceValue(trimmedValue, optionLabels);
  }
  if (args.selectorType === 'checklist') {
    return normalizeChecklistInferenceValue(trimmedValue, optionLabels);
  }
  if (SELECTOR_TYPES_REQUIRING_OPTIONS.has(args.selectorType)) {
    return normalizeOptionInferenceValue(trimmedValue, optionLabels);
  }
  return trimmedValue;
};

export const buildNormalizedParameterOptionLabels = (
  parameter: ProductParameterOptionSource,
  currentValue: string
): string[] => {
  const selectorType = parameter.selectorType ?? 'text';
  const optionLabels = Array.isArray(parameter.optionLabels) ? parameter.optionLabels : [];
  const normalizedOptionLabels = Array.from(
    new Set(
      optionLabels
        .map((value: string) => value.trim())
        .filter((value: string) => value.length > 0)
    )
  );

  if (
    currentValue.length > 0 &&
    SELECTOR_TYPES_REQUIRING_OPTIONS.has(selectorType) &&
    normalizedOptionLabels.includes(currentValue) !== true
  ) {
    normalizedOptionLabels.unshift(currentValue);
  }

  return normalizedOptionLabels;
};

export const dedupeCatalogLanguages = (
  languages: CatalogLanguageOption[]
): CatalogLanguageOption[] => {
  const seen = new Set<string>();
  return languages.filter((language: CatalogLanguageOption): boolean => {
    if (seen.has(language.code)) return false;
    seen.add(language.code);
    return true;
  });
};

export const resolveRowTriggerLanguages = (args: {
  catalogLanguages: CatalogLanguageOption[];
  activeLanguage: CatalogLanguageOption;
}): CatalogLanguageOption[] => {
  const targetLanguages = args.catalogLanguages.filter(
    (language: CatalogLanguageOption): boolean => ROW_TRIGGER_LANGUAGE_CODES.has(language.code)
  );
  if (targetLanguages.length === 0) return [args.activeLanguage];
  const activeTargetLanguage = ROW_TRIGGER_LANGUAGE_CODES.has(args.activeLanguage.code)
    ? [args.activeLanguage]
    : [];
  return dedupeCatalogLanguages([...activeTargetLanguage, ...targetLanguages]);
};

export const buildRowTriggerInferenceRows = (args: {
  rowIndex: number;
  parameter: ProductParameter | null;
  catalogLanguages: CatalogLanguageOption[];
  activeLanguage: CatalogLanguageOption;
  getLanguageValue: (languageCode: string) => string;
}): ParameterValueInferenceRunRow[] => {
  const parameter = args.parameter;
  if (parameter === null) return [];
  return resolveRowTriggerLanguages({
    catalogLanguages: args.catalogLanguages,
    activeLanguage: args.activeLanguage,
  }).map((language: CatalogLanguageOption): ParameterValueInferenceRunRow => {
    const currentValue = args.getLanguageValue(language.code);
    return {
      rowIndex: args.rowIndex,
      parameter,
      languageCode: language.code,
      languageLabel: language.label,
      currentValue,
      optionLabels: buildNormalizedParameterOptionLabels(parameter, currentValue),
    };
  });
};

export const normalizeParameterInferenceLabel = (value: unknown): string =>
  trimString(value)
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ');

export const isModelNameParameter = (parameter: ProductParameter): boolean => {
  const labels = [
    parameter.id,
    parameter.name_en,
    parameter.name_pl,
    parameter.name_de,
  ].map(normalizeParameterInferenceLabel);
  return labels.some(
    (label: string): boolean =>
      label === 'model' ||
      label.includes('model name') ||
      label.includes('nazwa modelu') ||
      label.includes('modelu')
  );
};

export const extractStructuredTitleLeadSegment = (title: string): string | null => {
  const leadSegment = title.split('|')[0] ?? '';
  const normalized = leadSegment.trim();
  return normalized.length > 0 ? normalized : null;
};

export const resolveParameterInferenceFallbackValue = (args: {
  parameter: ProductParameter;
  productTitle: string;
}): string | null => {
  if (args.parameter.selectorType !== 'text' && args.parameter.selectorType !== 'textarea') {
    return null;
  }
  if (isModelNameParameter(args.parameter) !== true) return null;
  return extractStructuredTitleLeadSegment(args.productTitle);
};

export const allowsEmptyInferenceValue = (
  selectorType: ProductParameter['selectorType']
): boolean => selectorType === 'checkbox';

export const resolveAppliedInferredValue = (args: {
  normalizedValue: string;
  selectorType: ProductParameter['selectorType'];
  fallbackValue: string | null;
}): string => {
  if (args.normalizedValue.length > 0) return args.normalizedValue;
  if (args.fallbackValue !== null) return args.fallbackValue;
  if (allowsEmptyInferenceValue(args.selectorType)) return args.normalizedValue;
  throw new Error('Parameter inference failed: the AI Path returned an empty parameter value.');
};

export const applyParameterValueToSnapshot = (
  values: ParameterValueRowsSnapshot,
  update: ParameterValueSnapshotUpdate
): ParameterValueRowsSnapshot =>
  values.map((entry: ProductParameterValue): ProductParameterValue => {
    if (entry.parameterId !== update.parameterId) return entry;

    const currentValuesByLanguage = entry.valuesByLanguage ?? {};
    const nextValuesByLanguage = update.value.length > 0
      ? { ...currentValuesByLanguage, [update.languageCode]: update.value }
      : Object.fromEntries(
          Object.entries(currentValuesByLanguage).filter(
            ([languageCode]: [string, string]): boolean => languageCode !== update.languageCode
          )
        );
    if (Object.keys(nextValuesByLanguage).length > 0) {
      return { ...entry, value: update.value, valuesByLanguage: nextValuesByLanguage };
    }
    return { parameterId: entry.parameterId, value: update.value };
  });

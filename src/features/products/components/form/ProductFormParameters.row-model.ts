import type { LabeledOptionDto } from '@/shared/contracts/base';
import type { ProductParameter } from '@/shared/contracts/products/parameters';
import type { ProductParameterValue } from '@/shared/contracts/products/product';

import {
  SELECTOR_TYPES_REQUIRING_OPTIONS,
  buildLabelOptions,
  buildNormalizedParameterOptionLabels,
  buildParameterOptions,
  buildRowTriggerInferenceRows,
  getLinkedTitleTermLabel,
  getParameterLanguageValue,
  parseChecklistValues,
} from './ProductFormParameters.helpers';
import type {
  CatalogLanguageOption,
  ParameterValueInferenceRunRow,
} from './ProductFormParameters.types';

export type ProductFormParameterRowModel = {
  rowKey: string;
  parameterOptions: Array<LabeledOptionDto<string>>;
  selectedParameter: ProductParameter | null;
  isSequenceExcluded: boolean;
  isLinkedParameter: boolean;
  linkedTitleTermLabel: string | null;
  selectorType: ProductParameter['selectorType'];
  needsOptions: boolean;
  activeLanguageValue: string;
  normalizedOptionLabels: string[];
  rowTriggerInferenceRows: ParameterValueInferenceRunRow[];
  checklistValues: string[];
  checklistValueKeys: Set<string>;
  checklistOptions: string[];
  selectLabelOptions: Array<LabeledOptionDto<string>>;
};

type ProductParameterAvailabilitySource = Omit<ProductParameter, 'linkedTitleTermType'> &
  Partial<Pick<ProductParameter, 'linkedTitleTermType'>>;

const buildRowKey = (entry: ProductParameterValue, index: number): string => {
  const parameterId = entry.parameterId.length > 0 ? entry.parameterId : 'new';
  return `${parameterId}-${index}`;
};

const isParameterAvailableForRow = (
  parameter: ProductParameterAvailabilitySource,
  entry: ProductParameterValue,
  selectedIds: string[]
): boolean => {
  const isSelectedInCurrentRow = parameter.id === entry.parameterId;
  if (selectedIds.includes(parameter.id) && isSelectedInCurrentRow !== true) return false;
  if (
    parameter.linkedTitleTermType !== null &&
    parameter.linkedTitleTermType !== undefined &&
    isSelectedInCurrentRow !== true
  ) {
    return false;
  }
  return true;
};

const buildChecklistValueModel = (args: {
  activeLanguageValue: string;
  normalizedOptionLabels: string[];
}): Pick<ProductFormParameterRowModel, 'checklistOptions' | 'checklistValueKeys' | 'checklistValues'> => {
  const currentChecklistValues = parseChecklistValues(args.activeLanguageValue);
  const optionLookup = new Map<string, string>();
  args.normalizedOptionLabels.forEach((label: string) => {
    optionLookup.set(label.trim().toLowerCase(), label);
  });
  const checklistValues = currentChecklistValues.map(
    (value: string): string => optionLookup.get(value.trim().toLowerCase()) ?? value
  );
  const checklistValueKeys = new Set<string>(
    checklistValues.map((value: string) => value.trim().toLowerCase())
  );
  const checklistOptions = buildChecklistOptions(args.normalizedOptionLabels, checklistValues);
  return { checklistOptions, checklistValueKeys, checklistValues };
};

const buildChecklistOptions = (
  normalizedOptionLabels: string[],
  checklistValues: string[]
): string[] => {
  const checklistOptions = [...normalizedOptionLabels];
  checklistValues.forEach((value: string) => {
    const key = value.trim().toLowerCase();
    const alreadyIncluded = checklistOptions.some(
      (option: string) => option.trim().toLowerCase() === key
    );
    if (alreadyIncluded !== true) checklistOptions.push(value);
  });
  return checklistOptions;
};

const resolveSelectedParameter = (args: {
  entry: ProductParameterValue;
  parameterById: Map<string, ProductParameter>;
}): ProductParameter | null => {
  if (args.entry.parameterId.length === 0) return null;
  return args.parameterById.get(args.entry.parameterId) ?? null;
};

const isLinkedParameter = (selectedParameter: ProductParameter | null): boolean =>
  selectedParameter?.linkedTitleTermType !== null &&
  selectedParameter?.linkedTitleTermType !== undefined;

const resolveSelectorType = (
  selectedParameter: ProductParameter | null
): ProductParameter['selectorType'] => selectedParameter?.selectorType ?? 'text';

const buildNormalizedOptionLabelsForRow = (args: {
  selectedParameter: ProductParameter | null;
  activeLanguageValue: string;
}): string[] => {
  if (args.selectedParameter === null) return [];
  return buildNormalizedParameterOptionLabels(args.selectedParameter, args.activeLanguageValue);
};

const buildRowParameterOptions = (args: {
  parameters: ProductParameter[];
  entry: ProductParameterValue;
  selectedIds: string[];
  preferredLocale: string;
}): Array<LabeledOptionDto<string>> =>
  buildParameterOptions(
    args.parameters.filter((parameter: ProductParameter): boolean =>
      isParameterAvailableForRow(parameter, args.entry, args.selectedIds)
    ),
    args.preferredLocale
  );

export const buildProductFormParameterRowModel = (args: {
  entry: ProductParameterValue;
  index: number;
  parameters: ProductParameter[];
  selectedIds: string[];
  preferredLocale: string;
  parameterById: Map<string, ProductParameter>;
  primaryLanguageCode: string;
  activeParameterLanguage: CatalogLanguageOption;
  catalogLanguages: CatalogLanguageOption[];
}): ProductFormParameterRowModel => {
  const selectedParameter = resolveSelectedParameter(args);
  const activeLanguageValue = getParameterLanguageValue(
    args.entry,
    args.activeParameterLanguage.code,
    args.primaryLanguageCode
  );
  const normalizedOptionLabels = buildNormalizedOptionLabelsForRow({
    selectedParameter,
    activeLanguageValue,
  });
  const checklistModel = buildChecklistValueModel({
    activeLanguageValue,
    normalizedOptionLabels,
  });
  const selectorType = resolveSelectorType(selectedParameter);

  return {
    rowKey: buildRowKey(args.entry, args.index),
    parameterOptions: buildRowParameterOptions(args),
    selectedParameter,
    isSequenceExcluded:
      args.entry.parameterId.length > 0 && args.entry.skipParameterInference === true,
    isLinkedParameter: isLinkedParameter(selectedParameter),
    linkedTitleTermLabel: getLinkedTitleTermLabel(
      selectedParameter?.linkedTitleTermType ?? null
    ),
    selectorType,
    needsOptions: SELECTOR_TYPES_REQUIRING_OPTIONS.has(selectorType),
    activeLanguageValue,
    normalizedOptionLabels,
    rowTriggerInferenceRows: buildRowTriggerInferenceRows({
      rowIndex: args.index,
      parameter: selectedParameter,
      catalogLanguages: args.catalogLanguages,
      activeLanguage: args.activeParameterLanguage,
      getLanguageValue: (languageCode: string): string =>
        getParameterLanguageValue(args.entry, languageCode, args.primaryLanguageCode),
    }),
    ...checklistModel,
    selectLabelOptions: buildLabelOptions(normalizedOptionLabels),
  };
};

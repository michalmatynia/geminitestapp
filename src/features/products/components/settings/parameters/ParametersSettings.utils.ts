import type { LabeledOptionDto } from '@/shared/contracts/base';
import type { CatalogRecord } from '@/shared/contracts/products/catalogs';
import type {
  ProductParameter,
  ProductParameterLinkedTitleTermType,
} from '@/shared/contracts/products/parameters';

import {
  EMPTY_PARAMETER_FORM_DATA,
  LINKABLE_SELECTOR_TYPES,
  LINKED_TITLE_TERM_OPTIONS,
  SELECTOR_TYPE_OPTIONS,
  SELECTOR_TYPES_REQUIRING_OPTIONS,
} from './ParametersSettings.constants';
import type {
  ParameterFormData,
  ParameterSelectorType,
  SelectAllChecked,
} from './ParametersSettings.types';

type ParameterPayloadResult =
  | {
      status: 'ready';
      payload: Partial<ProductParameter>;
    }
  | {
      status: 'error';
      message: string;
    };

const trimToNull = (value: string): string | null => {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const optionLabelsToMultiline = (labels: string[] | null | undefined): string =>
  (labels ?? []).filter((label) => label.length > 0).join('\n');

export const getLinkedTitleTermLabel = (
  value: ProductParameterLinkedTitleTermType
): string | null => {
  if (value === null) return null;
  return LINKED_TITLE_TERM_OPTIONS.find((option) => option.value === value)?.label ?? value;
};

export const normalizeOptionLabels = (input: string): string[] => {
  const seen = new Set<string>();
  return input
    .split('\n')
    .flatMap((line) => line.split(','))
    .map((value) => value.trim())
    .filter((value) => {
      if (value.length === 0) return false;
      const key = value.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
};

export const getSelectorTypeLabel = (value: ParameterSelectorType): string =>
  SELECTOR_TYPE_OPTIONS.find((option) => option.value === value)?.label ?? value;

export const normalizeParameterSelectorType = (value: string): ParameterSelectorType =>
  SELECTOR_TYPE_OPTIONS.some((option) => option.value === value)
    ? (value as ParameterSelectorType)
    : 'text';

export const getParameterSelectAllChecked = ({
  isAllSelected,
  isIndeterminateSelection,
}: {
  isAllSelected: boolean;
  isIndeterminateSelection: boolean;
}): SelectAllChecked => {
  if (isAllSelected) return true;
  if (isIndeterminateSelection) return 'indeterminate';
  return false;
};

export const createParameterFormDataForCatalog = (catalogId: string): ParameterFormData => ({
  ...EMPTY_PARAMETER_FORM_DATA,
  catalogId,
});

export const createParameterFormDataFromParameter = (
  parameter: ProductParameter
): ParameterFormData => ({
  name_en: parameter.name_en,
  name_pl: parameter.name_pl ?? '',
  name_de: parameter.name_de ?? '',
  catalogId: parameter.catalogId,
  selectorType: parameter.selectorType,
  optionLabelsInput: optionLabelsToMultiline(parameter.optionLabels),
  linkedTitleTermType: parameter.linkedTitleTermType ?? null,
});

export const buildCatalogOptions = (
  catalogs: CatalogRecord[]
): Array<LabeledOptionDto<string>> =>
  catalogs.map((catalog) => ({
    value: catalog.id,
    label: `${catalog.name}${catalog.isDefault ? ' (Default)' : ''}`,
  }));

export const buildDeleteIds = (parameterIds: string[]): string[] =>
  Array.from(new Set(parameterIds.filter((id) => id.trim().length > 0)));

export const buildParameterSavePayload = (
  formData: ParameterFormData
): ParameterPayloadResult => {
  if (formData.name_en.trim().length === 0) {
    return { status: 'error', message: 'English name is required.' };
  }
  if (formData.catalogId.length === 0) {
    return { status: 'error', message: 'Catalog is required.' };
  }

  const optionLabels = normalizeOptionLabels(formData.optionLabelsInput);
  if (SELECTOR_TYPES_REQUIRING_OPTIONS.has(formData.selectorType) && optionLabels.length === 0) {
    return { status: 'error', message: 'This selector type requires at least one value label.' };
  }
  if (
    formData.linkedTitleTermType !== null &&
    !LINKABLE_SELECTOR_TYPES.has(formData.selectorType)
  ) {
    return {
      status: 'error',
      message: 'Only text and textarea parameters can sync from English Title terms.',
    };
  }

  return {
    status: 'ready',
    payload: {
      name_en: formData.name_en.trim(),
      name_pl: trimToNull(formData.name_pl),
      name_de: trimToNull(formData.name_de),
      catalogId: formData.catalogId,
      selectorType: formData.selectorType,
      optionLabels,
      linkedTitleTermType: formData.linkedTitleTermType,
    },
  };
};

export const getParameterNoun = (count: number): string =>
  count === 1 ? 'parameter' : 'parameters';

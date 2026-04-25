import type { LabeledOptionWithDescriptionDto } from '@/shared/contracts/base';

import {
  createFilemakerValue,
  createFilemakerValueParameterLink,
} from '../settings';
import type {
  FilemakerDatabase,
  FilemakerValue,
  FilemakerValueParameter,
  FilemakerValueParameterLink,
} from '../types';
import { createClientFilemakerId } from './filemaker-page-utils';

export type ValueDraft = {
  description: string;
  label: string;
  parentId: string;
  sortOrder: string;
  value: string;
};

export const ROOT_PARENT_VALUE = '__root__';

export const EMPTY_VALUE_DRAFT: ValueDraft = {
  description: '',
  label: '',
  parentId: ROOT_PARENT_VALUE,
  sortOrder: '0',
  value: '',
};

export const getValueItemName = (
  isCreateMode: boolean,
  value: FilemakerValue | null
): string | null => {
  if (isCreateMode) return 'Create Value';
  return value?.label ?? null;
};

export const parseSortOrder = (value: string): number => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : 0;
};

const collectDescendantIds = (values: FilemakerValue[], valueId: string): Set<string> => {
  const descendants = new Set<string>();
  let changed = true;
  while (changed) {
    changed = false;
    values.forEach((entry: FilemakerValue): void => {
      const parentId = entry.parentId ?? '';
      if (parentId !== valueId && !descendants.has(parentId)) return;
      if (descendants.has(entry.id)) return;
      descendants.add(entry.id);
      changed = true;
    });
  }
  return descendants;
};

export const buildParentOptions = (
  values: FilemakerValue[],
  currentValueId: string
): Array<LabeledOptionWithDescriptionDto<string>> => {
  const excludedIds =
    currentValueId === 'new' ? new Set<string>() : collectDescendantIds(values, currentValueId);
  if (currentValueId !== 'new') excludedIds.add(currentValueId);
  return [
    { value: ROOT_PARENT_VALUE, label: 'Root', description: 'Top-level value.' },
    ...values
      .filter((entry: FilemakerValue): boolean => !excludedIds.has(entry.id))
      .sort((left: FilemakerValue, right: FilemakerValue) => {
        if (left.sortOrder !== right.sortOrder) return left.sortOrder - right.sortOrder;
        return left.label.localeCompare(right.label);
      })
      .map((entry: FilemakerValue) => ({
        value: entry.id,
        label: entry.label,
        description: entry.value,
      })),
  ];
};

export const hydrateDraftFromValue = (value: FilemakerValue): ValueDraft => ({
  description: value.description ?? '',
  label: value.label,
  parentId: value.parentId ?? ROOT_PARENT_VALUE,
  sortOrder: String(value.sortOrder),
  value: value.value,
});

export const normalizeDraft = (draft: ValueDraft): ValueDraft => ({
  description: draft.description.trim(),
  label: draft.label.trim(),
  parentId: draft.parentId === ROOT_PARENT_VALUE ? '' : draft.parentId.trim(),
  sortOrder: String(parseSortOrder(draft.sortOrder)),
  value: draft.value.trim(),
});

const getExistingValueCompatibilityFields = (
  value: FilemakerValue | undefined
): Pick<
  Partial<FilemakerValue>,
  'createdBy' | 'legacyListUuids' | 'legacyParentUuids' | 'legacyUuid' | 'updatedBy'
> => ({
  createdBy: value?.createdBy,
  legacyListUuids: value?.legacyListUuids,
  legacyParentUuids: value?.legacyParentUuids,
  legacyUuid: value?.legacyUuid,
  updatedBy: value?.updatedBy,
});

export const buildNextValue = (input: {
  draft: ValueDraft;
  existingValue?: FilemakerValue;
  id: string;
}): FilemakerValue =>
  createFilemakerValue({
    id: input.id,
    label: input.draft.label,
    value: input.draft.value,
    parentId: input.draft.parentId.length > 0 ? input.draft.parentId : null,
    description: input.draft.description.length > 0 ? input.draft.description : undefined,
    sortOrder: parseSortOrder(input.draft.sortOrder),
    ...getExistingValueCompatibilityFields(input.existingValue),
    createdAt: input.existingValue?.createdAt,
    updatedAt: new Date().toISOString(),
  });

export const getValueValidationMessage = (draft: ValueDraft): string | null => {
  if (draft.label.length === 0) return 'Value label and stored value are required.';
  if (draft.value.length === 0) return 'Value label and stored value are required.';
  return null;
};

export const resolveValueIdForSave = (
  isCreateMode: boolean,
  value: FilemakerValue | null
): string => {
  if (isCreateMode) return createClientFilemakerId('value');
  return value?.id ?? '';
};

export const buildNextValues = (input: {
  database: FilemakerDatabase;
  id: string;
  isCreateMode: boolean;
  nextValue: FilemakerValue;
}): FilemakerValue[] => {
  if (input.isCreateMode) return [...input.database.values, input.nextValue];
  return input.database.values.map((entry: FilemakerValue) =>
    entry.id === input.id ? input.nextValue : entry
  );
};

export const getValueSaveSuccessMessage = (isCreateMode: boolean): string =>
  isCreateMode ? 'Value created.' : 'Value updated.';

const createValueParameterLinkId = (valueId: string, parameterId: string): string =>
  `filemaker-value-parameter-link-${valueId}-${parameterId}`;

export const buildValueParameterLinks = (
  valueId: string,
  parameterIds: string[]
): FilemakerValueParameterLink[] =>
  parameterIds.map((parameterId: string) =>
    createFilemakerValueParameterLink({
      id: createValueParameterLinkId(valueId, parameterId),
      valueId,
      parameterId,
    })
  );

export const getLinkedValueParameterIds = (
  database: FilemakerDatabase,
  valueId: string
): string[] =>
  database.valueParameterLinks
    .filter((link: FilemakerValueParameterLink): boolean => link.valueId === valueId)
    .map((link: FilemakerValueParameterLink): string => link.parameterId);

export const filterValidParameterIds = (
  parameterIds: string[],
  parameters: FilemakerValueParameter[]
): string[] => {
  const knownParameterIds = new Set(
    parameters.map((parameter: FilemakerValueParameter) => parameter.id)
  );
  return parameterIds.filter((parameterId: string): boolean => knownParameterIds.has(parameterId));
};

import type { DynamicReplacementSourceMode } from '@/shared/contracts/products/validation';
import type {
  PatternFormData,
  ValidatorPatternSimulatorInput,
} from '@/shared/contracts/products/drafts';
import type { ProductCategory } from '@/shared/contracts/products/categories';
import {
  PRODUCT_VALIDATION_REPLACEMENT_FIELD_LABELS,
  PRODUCT_VALIDATION_SOURCE_FIELD_OPTIONS,
} from '@/features/products/lib/validatorSourceFields';
import { getReplacementFieldsForProductValidationTarget } from '@/features/products/lib/validatorTargetAdapters';

const SOURCE_FIELD_LABEL_MAP = new Map(
  PRODUCT_VALIDATION_SOURCE_FIELD_OPTIONS.map((option) => [option.value, option.label])
);

export const resolveSimulatorFieldName = (target: string, locale: string): string => {
  if (target === 'name' || target === 'description') {
    const normalizedLocale = locale.trim().toLowerCase();
    return `${target}_${normalizedLocale.length > 0 ? normalizedLocale : 'en'}`;
  }
  return getReplacementFieldsForProductValidationTarget(target)[0] ?? 'sku';
};

export const getFieldLabel = (fieldName: string): string =>
  SOURCE_FIELD_LABEL_MAP.get(fieldName) ??
  PRODUCT_VALIDATION_REPLACEMENT_FIELD_LABELS[fieldName] ??
  fieldName;

export const makeSimulatorInputKey = (
  sourceMode: DynamicReplacementSourceMode,
  fieldName: string
): string => `${sourceMode}:${fieldName}`;

const getSimulatorInputPlaceholder = (sourceMode: DynamicReplacementSourceMode): string => {
  if (sourceMode === 'latest_product_field') return 'Latest product source value';
  if (sourceMode === 'current_field') return 'Current field value';
  return 'Source value';
};

const createSimulatorInput = ({
  fieldName,
  labelPrefix,
  sourceMode,
}: {
  fieldName: string;
  labelPrefix: string;
  sourceMode: DynamicReplacementSourceMode;
}): ValidatorPatternSimulatorInput => ({
  fieldName,
  key: makeSimulatorInputKey(sourceMode, fieldName),
  label: `${labelPrefix} ${getFieldLabel(fieldName)}`,
  placeholder: getSimulatorInputPlaceholder(sourceMode),
  sourceMode,
});

const shouldAddSimulatorInput = ({
  currentFieldName,
  fieldName,
  seen,
  sourceMode,
}: {
  currentFieldName: string;
  fieldName: string;
  seen: Set<string>;
  sourceMode: DynamicReplacementSourceMode;
}): boolean => {
  if (fieldName.length === 0) return false;
  if (sourceMode === 'current_field') return false;
  if (sourceMode === 'form_field' && fieldName === currentFieldName) return false;
  return !seen.has(makeSimulatorInputKey(sourceMode, fieldName));
};

const addSimulatorInput = ({
  currentFieldName,
  fieldName,
  inputs,
  labelPrefix,
  seen,
  sourceMode,
}: {
  currentFieldName: string;
  fieldName: string;
  inputs: ValidatorPatternSimulatorInput[];
  labelPrefix: string;
  seen: Set<string>;
  sourceMode: DynamicReplacementSourceMode;
}): void => {
  const normalizedFieldName = fieldName.trim();
  if (!shouldAddSimulatorInput({ currentFieldName, fieldName: normalizedFieldName, seen, sourceMode })) {
    return;
  }
  seen.add(makeSimulatorInputKey(sourceMode, normalizedFieldName));
  inputs.push(
    createSimulatorInput({ fieldName: normalizedFieldName, labelPrefix, sourceMode })
  );
};

export const buildValidatorPatternSimulatorInputs = (
  formData: PatternFormData
): ValidatorPatternSimulatorInput[] => {
  const currentFieldName = resolveSimulatorFieldName(formData.target, formData.locale);
  const currentInput = createSimulatorInput({
    fieldName: currentFieldName,
    labelPrefix: 'Current',
    sourceMode: 'current_field',
  });
  const inputs: ValidatorPatternSimulatorInput[] = [currentInput];
  const seen = new Set<string>([currentInput.key]);
  addSimulatorInput({
    currentFieldName,
    fieldName: formData.sourceField,
    inputs,
    labelPrefix: 'Source',
    seen,
    sourceMode: formData.sourceMode,
  });
  if (formData.launchEnabled) {
    addSimulatorInput({
      currentFieldName,
      fieldName: formData.launchSourceField,
      inputs,
      labelPrefix: 'Launch',
      seen,
      sourceMode: formData.launchSourceMode,
    });
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
    catalogId: 'simulator',
    color: null,
    createdAt: '',
    id,
    name,
    name_de: parts[4] ?? name,
    name_en: parts[2] ?? name,
    name_pl: parts[3] ?? name,
    parentId: null,
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

export const buildCategoryNameById = (categories: ProductCategory[]): Map<string, string> =>
  new Map(
    categories
      .map((category) => [category.id, category.name] as const)
      .filter(([id, name]) => id.length > 0 && name.length > 0)
  );

export const toStringValue = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return '';
};

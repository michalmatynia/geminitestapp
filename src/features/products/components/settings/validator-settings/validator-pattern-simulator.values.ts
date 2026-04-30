import type { PatternFormData } from '@/shared/contracts/products/drafts';
import type { Producer } from '@/shared/contracts/products/producers';
import { buildProducerNameById } from '@/features/products/lib/resolveValidatorProducerReplacement';
import { buildProductValidationSourceValues } from '@/features/products/lib/validatorSourceFields';

import {
  buildCategoryNameById,
  buildValidatorPatternSimulatorInputs,
  makeSimulatorInputKey,
  parseValidatorPatternSimulatorCategoryFixtures,
  toStringValue,
} from './validator-pattern-simulator.inputs';

export type ValidatorPatternSimulationValues = {
  categories: ReturnType<typeof parseValidatorPatternSimulatorCategoryFixtures>;
  categoryNameById: ReturnType<typeof buildCategoryNameById>;
  currentFieldValue: string;
  latestProductValues: Record<string, unknown>;
  producerNameById: ReturnType<typeof buildProducerNameById>;
  rawFormValues: Record<string, unknown>;
  values: Record<string, unknown>;
};

const buildRawSimulatorValues = ({
  currentFieldName,
  formData,
  simulatorValues,
}: {
  currentFieldName: string;
  formData: PatternFormData;
  simulatorValues: Record<string, string>;
}): { latestProductValues: Record<string, unknown>; rawFormValues: Record<string, unknown> } => {
  const descriptors = buildValidatorPatternSimulatorInputs(formData);
  const currentFieldKey = makeSimulatorInputKey('current_field', currentFieldName);
  const rawFormValues: Record<string, unknown> = {
    [currentFieldName]: simulatorValues[currentFieldKey] ?? '',
  };
  const latestProductValues: Record<string, unknown> = {};
  for (const descriptor of descriptors) {
    const inputValue = simulatorValues[descriptor.key] ?? '';
    if (descriptor.sourceMode === 'latest_product_field') {
      latestProductValues[descriptor.fieldName] = inputValue;
    } else {
      rawFormValues[descriptor.fieldName] = inputValue;
    }
  }
  return { latestProductValues, rawFormValues };
};

const buildFormFieldSimulatorValues = (
  formData: PatternFormData,
  simulatorValues: Record<string, string>
): Record<string, unknown> =>
  Object.fromEntries(
    buildValidatorPatternSimulatorInputs(formData)
      .filter((descriptor) => descriptor.sourceMode === 'form_field')
      .map((descriptor) => [descriptor.fieldName, simulatorValues[descriptor.key] ?? ''])
  );

export const buildValidatorPatternSimulationValues = ({
  categoryFixturesText,
  currentFieldName,
  formData,
  producers,
  simulatorValues,
}: {
  categoryFixturesText: string;
  currentFieldName: string;
  formData: PatternFormData;
  producers?: ReadonlyArray<Producer>;
  simulatorValues: Record<string, string>;
}): ValidatorPatternSimulationValues => {
  const categories = parseValidatorPatternSimulatorCategoryFixtures(categoryFixturesText);
  const categoryNameById = buildCategoryNameById(categories);
  const producerNameById = buildProducerNameById(producers);
  const rawValues = buildRawSimulatorValues({ currentFieldName, formData, simulatorValues });
  const currentFieldValue = toStringValue(rawValues.rawFormValues[currentFieldName]);
  const selectedCategoryId =
    currentFieldName === 'categoryId' ? currentFieldValue : toStringValue(rawValues.rawFormValues['categoryId']);
  const values = {
    ...buildProductValidationSourceValues({
      baseValues: rawValues.rawFormValues,
      categories,
      fallbackCatalogId: 'simulator',
      producers,
      selectedCatalogIds: [],
      selectedCategoryId,
    }),
    ...buildFormFieldSimulatorValues(formData, simulatorValues),
  };
  return {
    categories,
    categoryNameById,
    currentFieldValue,
    latestProductValues: rawValues.latestProductValues,
    producerNameById,
    rawFormValues: rawValues.rawFormValues,
    values,
  };
};

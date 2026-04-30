'use client';

import React from 'react';

import { getProductValidationSemanticOperationUiMetadata } from '@/shared/lib/products/utils/validator-semantic-operations';
import { FormSection } from '@/shared/ui/form-section';

import { useValidatorSettingsContext } from '../ValidatorSettingsContext';
import {
  buildValidatorPatternSimulatorInputs,
  type ValidatorPatternSimulationResult,
} from '../validator-pattern-simulator';
import { ValidatorPatternModalSimulatorControls } from './ValidatorPatternModalSimulatorControls';
import { ValidatorPatternSimulationResultView } from './ValidatorPatternSimulationResultView';

type SimulatorSemanticUi = ReturnType<typeof getProductValidationSemanticOperationUiMetadata>;

const DEFAULT_SIMULATOR_SECTION_COPY = {
  description:
    'Preview how the current pattern would resolve and apply without touching live product data.',
  categoryFixturesLabel: 'Category Fixtures',
  categoryFixturesDescription:
    'Optional. One category per line: `id|name|name_en|name_pl|name_de`.',
  categoryFixturesPlaceholder: 'category-1|Keychains|Keychains|Breloki|Schlusselanhanger',
};

const resolveSimulatorCopyValue = (
  value: string | null | undefined,
  fallback: string
): string => {
  if (typeof value === 'string' && value !== '') return value;
  return fallback;
};

const resolveSimulatorSectionCopy = (
  semanticUi: SimulatorSemanticUi
): {
  description: string;
  categoryFixturesLabel: string;
  categoryFixturesDescription: string;
  categoryFixturesPlaceholder: string;
} => {
  if (semanticUi === null) return DEFAULT_SIMULATOR_SECTION_COPY;
  return {
    description: resolveSimulatorCopyValue(
      semanticUi.simulatorDescription,
      DEFAULT_SIMULATOR_SECTION_COPY.description
    ),
    categoryFixturesLabel: resolveSimulatorCopyValue(
      semanticUi.categoryFixturesLabel,
      DEFAULT_SIMULATOR_SECTION_COPY.categoryFixturesLabel
    ),
    categoryFixturesDescription: resolveSimulatorCopyValue(
      semanticUi.categoryFixturesDescription,
      DEFAULT_SIMULATOR_SECTION_COPY.categoryFixturesDescription
    ),
    categoryFixturesPlaceholder: resolveSimulatorCopyValue(
      semanticUi.categoryFixturesPlaceholder,
      DEFAULT_SIMULATOR_SECTION_COPY.categoryFixturesPlaceholder
    ),
  };
};

export function ValidatorPatternModalSimulatorSection(): React.JSX.Element {
  const {
    formData,
    modalSemanticState,
    testResult,
    simulatorScope,
    setSimulatorScope,
    simulatorValues,
    setSimulatorValue,
    simulatorCategoryFixtures,
    setSimulatorCategoryFixtures,
  } = useValidatorSettingsContext();

  const simulatorInputs = React.useMemo(
    () => buildValidatorPatternSimulatorInputs(formData),
    [formData]
  );
  const semanticUi = React.useMemo(
    () => getProductValidationSemanticOperationUiMetadata(modalSemanticState?.operation),
    [modalSemanticState?.operation]
  );
  const copy = resolveSimulatorSectionCopy(semanticUi);

  return (
    <FormSection
      title='Simulator'
      description={copy.description}
      variant='subtle'
      className='p-4'
    >
      <div className='space-y-4'>
        <ValidatorPatternModalSimulatorControls
          simulatorScope={simulatorScope}
          setSimulatorScope={setSimulatorScope}
          simulatorInputs={simulatorInputs}
          simulatorValues={simulatorValues}
          setSimulatorValue={setSimulatorValue}
          target={formData.target}
          simulatorCategoryFixtures={simulatorCategoryFixtures}
          setSimulatorCategoryFixtures={setSimulatorCategoryFixtures}
          categoryFixturesLabel={copy.categoryFixturesLabel}
          categoryFixturesDescription={copy.categoryFixturesDescription}
          categoryFixturesPlaceholder={copy.categoryFixturesPlaceholder}
        />
        <ValidatorPatternSimulationResultView
          result={testResult as ValidatorPatternSimulationResult}
        />
      </div>
    </FormSection>
  );
}

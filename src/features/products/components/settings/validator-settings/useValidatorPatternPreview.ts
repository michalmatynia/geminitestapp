import { useMemo } from 'react';

import type { Producer } from '@/shared/contracts/products/producers';
import type { PatternFormData, SequenceGroupView } from '@/shared/contracts/products/drafts';
import type {
  ProductValidationInstanceScope,
  ProductValidationPattern,
  ProductValidationSemanticState,
} from '@/shared/contracts/products/validation';

import {
  buildAndSimulateValidatorPatternPreview,
  type ValidatorPatternSimulationResult,
} from './validator-pattern-simulator';

type ValidatorPatternPreviewArgs = {
  formData: PatternFormData;
  sequenceGroups: Map<string, SequenceGroupView>;
  orderedPatterns: ProductValidationPattern[];
  editingPattern: ProductValidationPattern | null;
  modalSemanticState: ProductValidationSemanticState | null;
  simulatorScope: ProductValidationInstanceScope;
  simulatorValues: Record<string, string>;
  simulatorCategoryFixtures: string;
  producers: Producer[];
};

export function useValidatorPatternPreview({
  formData,
  sequenceGroups,
  orderedPatterns,
  editingPattern,
  modalSemanticState,
  simulatorScope,
  simulatorValues,
  simulatorCategoryFixtures,
  producers,
}: ValidatorPatternPreviewArgs): ValidatorPatternSimulationResult {
  return useMemo(
    () =>
      buildAndSimulateValidatorPatternPreview({
        formData,
        sequenceGroups,
        orderedPatterns,
        editingPattern,
        modalSemanticState,
        validationScope: simulatorScope,
        simulatorValues,
        categoryFixturesText: simulatorCategoryFixtures,
        producers,
      }),
    [
      editingPattern,
      formData,
      modalSemanticState,
      orderedPatterns,
      producers,
      sequenceGroups,
      simulatorCategoryFixtures,
      simulatorScope,
      simulatorValues,
    ]
  );
}

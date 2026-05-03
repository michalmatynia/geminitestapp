import { useMemo } from 'react';

import type { ValidatorSettingsController, SequenceGroupView } from '@/shared/contracts/products/drafts';
import type { Producer } from '@/shared/contracts/products/producers';
import type { ProductValidationPattern } from '@/shared/contracts/products/validation';

import { buildSequenceGroups, sortPatternsBySequence } from './helpers';
import {
  useValidatorModalSemanticState,
  useValidatorModalSemanticTransition,
} from './useValidatorModalSemanticState';
import { useValidatorPatternPreview } from './useValidatorPatternPreview';
import { useValidatorSequenceMetadata } from './useValidatorSequenceMetadata';
import type { ValidatorControllerState } from './useValidatorSettingsController.types';

export type ValidatorDerivedState = {
  orderedPatterns: ProductValidationPattern[];
  sequenceGroups: Map<string, SequenceGroupView>;
  modalSemanticState: ValidatorSettingsController['modalSemanticState'];
  modalSemanticTransition: ValidatorSettingsController['modalSemanticTransition'];
  sequenceScopedPatternIds: Set<string>;
  firstPatternIdByGroup: ValidatorSettingsController['firstPatternIdByGroup'];
  testResult: ValidatorSettingsController['testResult'];
  summary: ValidatorSettingsController['summary'];
};

export function useValidatorSettingsControllerDerivedState({
  patterns,
  state,
  producers,
}: {
  patterns: ProductValidationPattern[];
  state: ValidatorControllerState;
  producers: Producer[];
}): ValidatorDerivedState {
  const orderedPatterns = useMemo(() => sortPatternsBySequence(patterns), [patterns]);
  const sequenceGroups = useMemo(() => buildSequenceGroups(orderedPatterns), [orderedPatterns]);
  const modalSemanticState = useValidatorModalSemanticState({
    formData: state.formData,
    sequenceGroups,
    editingPattern: state.editingPattern,
    semanticStateSeed: state.modalSemanticStateSeed,
  });
  const modalSemanticTransition = useValidatorModalSemanticTransition({
    previous: state.modalSemanticStateSeed,
    current: modalSemanticState,
  });
  const sequenceMetadata = useValidatorSequenceMetadata(sequenceGroups);
  const testResult = useValidatorPatternPreview({
    formData: state.formData,
    sequenceGroups,
    orderedPatterns,
    editingPattern: state.editingPattern,
    modalSemanticState,
    simulatorScope: state.simulatorScope,
    simulatorValues: state.simulatorValues,
    simulatorCategoryFixtures: state.simulatorCategoryFixtures,
    producers,
  });
  const summary = useMemo(
    () => ({
      total: patterns.length,
      enabled: patterns.filter((pattern) => pattern.enabled).length,
      replacementEnabled: patterns.filter((pattern) => pattern.replacementEnabled).length,
    }),
    [patterns]
  );

  return {
    orderedPatterns,
    sequenceGroups,
    modalSemanticState,
    modalSemanticTransition,
    sequenceScopedPatternIds: sequenceMetadata.sequenceScopedPatternIds,
    firstPatternIdByGroup: sequenceMetadata.firstPatternIdByGroup,
    testResult,
    summary,
  };
}

import { useCallback } from 'react';

import type { PatternFormData } from '@/shared/contracts/products/drafts';
import type {
  ProductValidationPattern,
  ProductValidationSemanticState,
} from '@/shared/contracts/products/validation';
import { getProductValidationSemanticState } from '@/shared/lib/products/utils/validator-semantic-state';

import { buildFormDataFromPattern } from './controller-form-utils';
import { buildDuplicateLabel, EMPTY_FORM } from './helpers';
import { normalizeProductValidationTarget } from './validator-settings-target';
import type { ValidatorPatternModalActions } from './useValidatorSettingsController.types';

type PatternModalActionsArgs = {
  patterns: ProductValidationPattern[];
  setEditingPattern: (pattern: ProductValidationPattern | null) => void;
  setModalSemanticState: (state: ProductValidationSemanticState | null) => void;
  setFormData: (formData: PatternFormData) => void;
  resetSimulator: () => void;
  setShowModal: (show: boolean) => void;
};

export function useValidatorPatternModalActions({
  patterns,
  setEditingPattern,
  setModalSemanticState,
  setFormData,
  resetSimulator,
  setShowModal,
}: PatternModalActionsArgs): ValidatorPatternModalActions {
  const handleAddPattern = useCallback(
    (target?: string): void => {
      setEditingPattern(null);
      setModalSemanticState(null);
      setFormData({
        ...EMPTY_FORM,
        target: normalizeProductValidationTarget(target),
      });
      resetSimulator();
      setShowModal(true);
    },
    [resetSimulator, setEditingPattern, setFormData, setModalSemanticState, setShowModal]
  );

  const handleEditPattern = useCallback(
    (pattern: ProductValidationPattern): void => {
      setEditingPattern(pattern);
      setModalSemanticState(getProductValidationSemanticState(pattern));
      setFormData(buildFormDataFromPattern(pattern));
      resetSimulator();
      setShowModal(true);
    },
    [resetSimulator, setEditingPattern, setFormData, setModalSemanticState, setShowModal]
  );

  const handleDuplicatePattern = useCallback(
    (pattern: ProductValidationPattern): void => {
      const duplicated = buildFormDataFromPattern(pattern);
      duplicated.label = buildDuplicateLabel(
        pattern.label,
        new Set(patterns.map((p) => p.label.toLowerCase()))
      );
      setEditingPattern(null);
      setModalSemanticState(getProductValidationSemanticState(pattern));
      setFormData(duplicated);
      resetSimulator();
      setShowModal(true);
    },
    [patterns, resetSimulator, setEditingPattern, setFormData, setModalSemanticState, setShowModal]
  );

  return {
    handleAddPattern,
    handleEditPattern,
    handleDuplicatePattern,
  };
}

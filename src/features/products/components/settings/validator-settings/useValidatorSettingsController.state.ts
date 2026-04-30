import { useCallback, useState } from 'react';

import type { PatternFormData } from '@/shared/contracts/products/drafts';
import type {
  ProductValidationInstanceScope,
  ProductValidationPattern,
  ProductValidationSemanticState,
  SequenceGroupDraft,
} from '@/shared/contracts/products/validation';

import { EMPTY_FORM } from './helpers';
import type { ValidatorControllerState } from './useValidatorSettingsController.types';

export function useValidatorSettingsControllerState(): ValidatorControllerState {
  const [showModal, setShowModal] = useState(false);
  const [editingPattern, setEditingPattern] = useState<ProductValidationPattern | null>(null);
  const [modalSemanticStateSeed, setModalSemanticState] =
    useState<ProductValidationSemanticState | null>(null);
  const [formData, setFormData] = useState<PatternFormData>(EMPTY_FORM);
  const [simulatorScope, setSimulatorScope] =
    useState<ProductValidationInstanceScope>('product_edit');
  const [simulatorValues, setSimulatorValues] = useState<Record<string, string>>({});
  const [simulatorCategoryFixtures, setSimulatorCategoryFixtures] = useState<string>('');
  const [groupDrafts, setGroupDrafts] = useState<Record<string, SequenceGroupDraft>>({});
  const [draggedPatternId, setDraggedPatternId] = useState<string | null>(null);
  const [dragOverPatternId, setDragOverPatternId] = useState<string | null>(null);
  const [patternToDelete, setPatternToDelete] = useState<ProductValidationPattern | null>(null);

  const closeModal = useCallback((): void => {
    setShowModal(false);
    setModalSemanticState(null);
  }, []);

  const resetSimulator = useCallback((): void => {
    setSimulatorScope('product_edit');
    setSimulatorValues({});
    setSimulatorCategoryFixtures('');
  }, []);

  const setSimulatorValue = useCallback((key: string, value: string): void => {
    setSimulatorValues((prev) => {
      if (prev[key] === value) return prev;
      return {
        ...prev,
        [key]: value,
      };
    });
  }, []);

  return {
    showModal,
    setShowModal,
    closeModal,
    editingPattern,
    setEditingPattern,
    modalSemanticStateSeed,
    setModalSemanticState,
    formData,
    setFormData,
    simulatorScope,
    setSimulatorScope,
    simulatorValues,
    setSimulatorValue,
    simulatorCategoryFixtures,
    setSimulatorCategoryFixtures,
    groupDrafts,
    setGroupDrafts,
    draggedPatternId,
    setDraggedPatternId,
    dragOverPatternId,
    setDragOverPatternId,
    patternToDelete,
    setPatternToDelete,
    resetSimulator,
  };
}

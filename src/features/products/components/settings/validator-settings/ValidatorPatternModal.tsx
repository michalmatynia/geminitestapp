'use client';

import React from 'react';

import { getProductValidationSemanticOperationUiMetadata } from '@/shared/lib/products/utils/validator-semantic-operations';
import { FormModal } from '@/shared/ui/FormModal';

import { buildSemanticTransitionNotice } from './ValidatorPatternModal.helpers';
import { ValidatorPatternModalContent } from './ValidatorPatternModal.sections';
import { useValidatorSettingsContext } from './ValidatorSettingsContext';

/**
 * Validator docs: see docs/validator/function-reference.md#ui.validatorpatternmodal
 */
export function ValidatorPatternModal(): React.JSX.Element | null {
  const {
    showModal,
    editingPattern,
    modalSemanticState,
    modalSemanticTransition,
    createPatternPending,
    updatePatternPending,
    closeModal,
    handleSave,
  } = useValidatorSettingsContext();
  const semanticUi = React.useMemo(
    () => getProductValidationSemanticOperationUiMetadata(modalSemanticState?.operation),
    [modalSemanticState?.operation]
  );
  const previousSemanticUi = React.useMemo(
    () => getProductValidationSemanticOperationUiMetadata(modalSemanticTransition.previous?.operation),
    [modalSemanticTransition.previous?.operation]
  );
  const transitionNotice = React.useMemo(
    () =>
      buildSemanticTransitionNotice({
        kind: modalSemanticTransition.kind,
        previousTitle: previousSemanticUi?.title ?? null,
        currentTitle: semanticUi?.title ?? null,
      }),
    [modalSemanticTransition.kind, previousSemanticUi?.title, semanticUi?.title]
  );

  if (!showModal) return null;

  return (
    <FormModal
      open={showModal}
      onClose={closeModal}
      title={editingPattern ? 'Edit Validator Pattern' : 'Create Validator Pattern'}
      onSave={(): void => {
        void handleSave();
      }}
      isSaving={createPatternPending || updatePatternPending}
      size='lg'
    >
      <ValidatorPatternModalContent semanticUi={semanticUi} transitionNotice={transitionNotice} />
    </FormModal>
  );
}

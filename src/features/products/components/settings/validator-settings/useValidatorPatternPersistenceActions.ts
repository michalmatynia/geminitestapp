import { useCallback } from 'react';

import type { PatternFormData, SequenceGroupView } from '@/shared/contracts/products/drafts';
import type {
  CreateProductValidationPatternInput as CreateValidationPatternPayload,
  ProductValidationPattern,
  ProductValidationSemanticState,
  UpdateProductValidationPatternInput as UpdateValidationPatternPayload,
} from '@/shared/contracts/products/validation';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';

import { buildPatternPayloadDiff } from './controller-diff-utils';
import { buildValidatorPatternSavePayload } from './validator-settings-payload';
import type {
  ValidatorPatternPersistenceActions,
  ValidatorSettingsMutations,
  ValidatorToast,
} from './useValidatorSettingsController.types';

type SaveResult = {
  message: string;
  variant: 'success' | 'info';
};

type PatternSaveArgs = {
  formData: PatternFormData;
  sequenceGroups: Map<string, SequenceGroupView>;
  editingPattern: ProductValidationPattern | null;
  modalSemanticState: ProductValidationSemanticState | null;
  mutations: Pick<ValidatorSettingsMutations, 'createPattern' | 'updatePattern'>;
  closeModal: () => void;
  toast: ValidatorToast;
};

type PatternMutationArgs = {
  mutations: Pick<ValidatorSettingsMutations, 'updatePattern' | 'deletePattern'>;
  toast: ValidatorToast;
};

const saveValidatorPatternPayload = async ({
  payload,
  editingPattern,
  mutations,
}: {
  payload: UpdateValidationPatternPayload;
  editingPattern: ProductValidationPattern | null;
  mutations: Pick<ValidatorSettingsMutations, 'createPattern' | 'updatePattern'>;
}): Promise<SaveResult> => {
  if (editingPattern !== null) {
    const changedPayload = buildPatternPayloadDiff(editingPattern, payload);
    if (Object.keys(changedPayload).length === 0) {
      return { message: 'No changes to save.', variant: 'info' };
    }
    await mutations.updatePattern.mutateAsync({ id: editingPattern.id, data: changedPayload });
    return { message: 'Pattern updated.', variant: 'success' };
  }

  await mutations.createPattern.mutateAsync(payload as CreateValidationPatternPayload);
  return { message: 'Pattern created.', variant: 'success' };
};

const usePatternSaveAction = ({
  formData,
  sequenceGroups,
  editingPattern,
  modalSemanticState,
  mutations,
  closeModal,
  toast,
}: PatternSaveArgs): (() => Promise<void>) =>
  useCallback(async (): Promise<void> => {
    const result = buildValidatorPatternSavePayload({
      formData,
      sequenceGroups,
      editingPattern,
      semanticState: modalSemanticState,
    });
    if (result.status === 'error') {
      toast(result.message, { variant: 'error' });
      return;
    }

    try {
      const saveResult = await saveValidatorPatternPayload({
        payload: result.payload,
        editingPattern,
        mutations,
      });
      toast(saveResult.message, { variant: saveResult.variant });
      closeModal();
    } catch (error) {
      logClientCatch(error, {
        source: 'useValidatorSettingsController',
        action: 'savePattern',
        editingId: editingPattern?.id,
      });
      toast(error instanceof Error ? error.message : 'Failed to save pattern.', {
        variant: 'error',
      });
    }
  }, [
    closeModal,
    editingPattern,
    formData,
    modalSemanticState,
    mutations,
    sequenceGroups,
    toast,
  ]);

const usePatternToggleAction = ({
  mutations,
  toast,
}: PatternMutationArgs): ((pattern: ProductValidationPattern) => Promise<void>) =>
  useCallback(
    async (pattern: ProductValidationPattern): Promise<void> => {
      try {
        await mutations.updatePattern.mutateAsync({
          id: pattern.id,
          data: { enabled: !pattern.enabled },
        });
        toast(`Pattern ${!pattern.enabled ? 'enabled' : 'disabled'}.`, {
          variant: 'success',
        });
      } catch (error) {
        logClientCatch(error, {
          source: 'useValidatorSettingsController',
          action: 'togglePattern',
          patternId: pattern.id,
        });
        toast(error instanceof Error ? error.message : 'Failed to update pattern.', {
          variant: 'error',
        });
      }
    },
    [mutations.updatePattern, toast]
  );

const usePatternDeleteAction = ({
  mutations,
  toast,
}: PatternMutationArgs): ((id: string) => Promise<void>) =>
  useCallback(
    async (id: string): Promise<void> => {
      try {
        await mutations.deletePattern.mutateAsync(id);
        toast('Pattern deleted.', { variant: 'success' });
      } catch (error) {
        logClientCatch(error, {
          source: 'useValidatorSettingsController',
          action: 'deletePattern',
          patternId: id,
        });
        toast(error instanceof Error ? error.message : 'Failed to delete pattern.', {
          variant: 'error',
        });
      }
    },
    [mutations.deletePattern, toast]
  );

export function useValidatorPatternPersistenceActions(
  args: PatternSaveArgs & PatternMutationArgs
): ValidatorPatternPersistenceActions {
  const handleSavePattern = usePatternSaveAction(args);
  const handleTogglePattern = usePatternToggleAction(args);
  const handleDeletePattern = usePatternDeleteAction(args);

  return {
    handleSave: handleSavePattern,
    handleSavePattern,
    handleTogglePattern,
    handleDeletePattern,
  };
}

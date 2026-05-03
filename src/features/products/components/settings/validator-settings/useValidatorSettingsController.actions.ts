import type { QueryClient } from '@tanstack/react-query';

import type { ValidatorSettingsController } from '@/shared/contracts/products/drafts';

import type { SequenceActionResult } from './sequence-actions/types';
import type { ValidatorSettingsData } from './useValidatorSettingsController.data';
import type { ValidatorDerivedState } from './useValidatorSettingsController.derived';
import { useValidatorGroupDraftGetter } from './useValidatorGroupDrafts';
import { useValidatorPatternModalActions } from './useValidatorPatternModalActions';
import { useValidatorPatternPersistenceActions } from './useValidatorPatternPersistenceActions';
import {
  useValidatorBaseReorderAction,
  useValidatorReorderActions,
} from './useValidatorReorderActions';
import { useValidatorSequenceActions } from './useValidatorSequenceActions';
import { useValidatorSettingsActions } from './useValidatorSettingsActions';
import type {
  ValidatorControllerState,
  ValidatorPatternModalActions,
  ValidatorPatternPersistenceActions,
  ValidatorReorderActions,
  ValidatorSettingsActions,
  ValidatorSettingsMutations,
  ValidatorToast,
} from './useValidatorSettingsController.types';

export type ValidatorControllerActions = {
  getGroupDraft: ValidatorSettingsController['getGroupDraft'];
  sequenceActions: SequenceActionResult;
  reorderActions: ValidatorReorderActions;
  patternModalActions: ValidatorPatternModalActions;
  patternPersistenceActions: ValidatorPatternPersistenceActions;
  settingsActions: ValidatorSettingsActions;
};

type ControllerActionsArgs = {
  data: ValidatorSettingsData;
  derived: ValidatorDerivedState;
  state: ValidatorControllerState;
  mutations: ValidatorSettingsMutations;
  queryClient: QueryClient;
  toast: ValidatorToast;
};

type ValidatorSequenceControllerActions = Pick<
  ValidatorControllerActions,
  'getGroupDraft' | 'sequenceActions' | 'reorderActions'
>;

type ValidatorPatternControllerActions = Pick<
  ValidatorControllerActions,
  'patternModalActions' | 'patternPersistenceActions' | 'settingsActions'
>;

function useValidatorSequenceControllerActions({
  data,
  derived,
  state,
  mutations,
  queryClient,
  toast,
}: ControllerActionsArgs): ValidatorSequenceControllerActions {
  const getGroupDraft = useValidatorGroupDraftGetter({
    groupDrafts: state.groupDrafts,
    sequenceGroups: derived.sequenceGroups,
  });
  const sequenceActions = useValidatorSequenceActions({
    patterns: data.patterns,
    orderedPatterns: derived.orderedPatterns,
    sequenceGroups: derived.sequenceGroups,
    getGroupDraft,
    setGroupDrafts: state.setGroupDrafts,
    queryClient,
    mutations,
    toast,
  });
  const handleReorder = useValidatorBaseReorderAction({
    patterns: data.patterns,
    reorderPatterns: mutations.reorderPatterns,
    toast,
  });
  const reorderActions = useValidatorReorderActions({
    patterns: data.patterns,
    orderedPatterns: derived.orderedPatterns,
    sequenceGroups: derived.sequenceGroups,
    sequenceScopedPatternIds: derived.sequenceScopedPatternIds,
    reorderPatterns: mutations.reorderPatterns,
    handleReorder,
    toast,
  });

  return {
    getGroupDraft,
    sequenceActions,
    reorderActions,
  };
}

function useValidatorPatternControllerActions({
  data,
  derived,
  state,
  mutations,
  toast,
}: ControllerActionsArgs): ValidatorPatternControllerActions {
  const patternModalActions = useValidatorPatternModalActions({
    patterns: data.patterns,
    setEditingPattern: state.setEditingPattern,
    setModalSemanticState: state.setModalSemanticState,
    setFormData: state.setFormData,
    resetSimulator: state.resetSimulator,
    setShowModal: state.setShowModal,
  });
  const patternPersistenceActions = useValidatorPatternPersistenceActions({
    formData: state.formData,
    sequenceGroups: derived.sequenceGroups,
    editingPattern: state.editingPattern,
    modalSemanticState: derived.modalSemanticState,
    mutations,
    closeModal: state.closeModal,
    toast,
  });
  const settingsActions = useValidatorSettingsActions({
    settings: data.settings,
    updateSettings: mutations.updateSettings,
    toast,
  });

  return {
    patternModalActions,
    patternPersistenceActions,
    settingsActions,
  };
}

export function useValidatorSettingsControllerActions(
  args: ControllerActionsArgs
): ValidatorControllerActions {
  return {
    ...useValidatorSequenceControllerActions(args),
    ...useValidatorPatternControllerActions(args),
  };
}

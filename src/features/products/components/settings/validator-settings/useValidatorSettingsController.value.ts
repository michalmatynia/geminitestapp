import type { SequenceActionResult } from './sequence-actions/types';
import {
  formatReplacementFields,
  getReplacementFieldsForTarget,
  getSourceFieldOptionsForTarget,
  isLocaleTarget,
  normalizeReplacementFields,
  REPLACEMENT_FIELD_OPTIONS,
} from './helpers';
import type { ValidatorSettingsData } from './useValidatorSettingsController.data';
import type {
  ValidatorControllerState,
  ValidatorPatternModalActions,
  ValidatorPatternPersistenceActions,
  ValidatorReorderActions,
  ValidatorSettingsActions,
  ValidatorSettingsMutations,
} from './useValidatorSettingsController.types';

import type { ValidatorSettingsController } from '@/shared/contracts/products/drafts';
import type { ProductValidationPattern } from '@/shared/contracts/products/validation';
import { normalizeProductValidationInstanceDenyBehaviorMap } from '@/shared/lib/products/utils/validator-instance-behavior';

type ValidatorSummary = ValidatorSettingsController['summary'];

type ControllerValueArgs = {
  data: ValidatorSettingsData;
  state: ValidatorControllerState;
  mutations: ValidatorSettingsMutations;
  summary: ValidatorSummary;
  orderedPatterns: ProductValidationPattern[];
  modalSemanticState: ValidatorSettingsController['modalSemanticState'];
  modalSemanticTransition: ValidatorSettingsController['modalSemanticTransition'];
  testResult: ValidatorSettingsController['testResult'];
  sequenceGroups: ValidatorSettingsController['sequenceGroups'];
  sequenceScopedPatternIds: Set<string>;
  firstPatternIdByGroup: ValidatorSettingsController['firstPatternIdByGroup'];
  patternModalActions: ValidatorPatternModalActions;
  patternPersistenceActions: ValidatorPatternPersistenceActions;
  settingsActions: ValidatorSettingsActions;
  reorderActions: ValidatorReorderActions;
  sequenceActions: SequenceActionResult;
  getGroupDraft: ValidatorSettingsController['getGroupDraft'];
};

const hasPendingMutation = (pendingStates: readonly boolean[]): boolean =>
  pendingStates.includes(true);

const buildStatusSection = (args: ControllerValueArgs): Partial<ValidatorSettingsController> => ({
  patterns: args.data.patterns,
  settings: args.data.settings,
  summary: args.summary,
  orderedPatterns: args.orderedPatterns,
  enabledByDefault: args.data.settings?.enabledByDefault ?? true,
  formatterEnabledByDefault: args.data.settings?.formatterEnabledByDefault ?? false,
  instanceDenyBehavior: normalizeProductValidationInstanceDenyBehaviorMap(
    args.data.settings?.instanceDenyBehavior ?? {}
  ),
  loading: args.data.patternsQuery.isLoading || args.data.settingsQuery.isLoading,
  isUpdating: hasPendingMutation([
    args.mutations.createPattern.isPending,
    args.mutations.updatePattern.isPending,
    args.mutations.deletePattern.isPending,
    args.mutations.reorderPatterns.isPending,
    args.mutations.updateSettings.isPending,
  ]),
  settingsBusy: args.mutations.updateSettings.isPending,
  patternActionsPending: hasPendingMutation([
    args.mutations.createPattern.isPending,
    args.mutations.updatePattern.isPending,
    args.mutations.deletePattern.isPending,
  ]),
  reorderPending: args.mutations.reorderPatterns.isPending,
});

const buildModalSection = (args: ControllerValueArgs): Partial<ValidatorSettingsController> => ({
  showModal: args.state.showModal,
  setShowModal: args.state.setShowModal,
  closeModal: args.state.closeModal,
  editingPattern: args.state.editingPattern,
  modalSemanticState: args.modalSemanticState,
  modalSemanticTransition: args.modalSemanticTransition,
  formData: args.state.formData,
  setFormData: args.state.setFormData,
  testResult: args.testResult,
  simulatorScope: args.state.simulatorScope,
  setSimulatorScope: args.state.setSimulatorScope,
  simulatorValues: args.state.simulatorValues,
  setSimulatorValue: args.state.setSimulatorValue,
  simulatorCategoryFixtures: args.state.simulatorCategoryFixtures,
  setSimulatorCategoryFixtures: args.state.setSimulatorCategoryFixtures,
  replacementFieldOptions: REPLACEMENT_FIELD_OPTIONS,
  sourceFieldOptions: getSourceFieldOptionsForTarget(args.state.formData.target),
  createPatternPending: args.mutations.createPattern.isPending,
  updatePatternPending: args.mutations.updatePattern.isPending,
});

const buildHelperSection = (): Partial<ValidatorSettingsController> => ({
  isLocaleTarget,
  normalizeReplacementFields,
  getReplacementFieldsForTarget,
  getSourceFieldOptionsForTarget,
  formatReplacementFields,
});

const buildDragSection = (args: ControllerValueArgs): Partial<ValidatorSettingsController> => ({
  draggedPatternId: args.state.draggedPatternId,
  setDraggedPatternId: args.state.setDraggedPatternId,
  dragOverPatternId: args.state.dragOverPatternId,
  setDragOverPatternId: args.state.setDragOverPatternId,
  ...args.reorderActions,
});

const buildSequenceSection = (args: ControllerValueArgs): Partial<ValidatorSettingsController> => ({
  sequenceGroups: args.sequenceGroups,
  firstPatternIdByGroup: args.firstPatternIdByGroup,
  getSequenceGroupId: (pattern) =>
    args.sequenceScopedPatternIds.has(pattern.id) ? pattern.sequenceGroupId : null,
  handleMoveGroup: args.sequenceActions.handleMoveGroup,
  handleReorderInGroup: args.reorderActions.handleReorderInGroup,
  handleMoveToGroup: args.sequenceActions.handleMoveToGroup,
  handleRemoveFromGroup: args.sequenceActions.handleRemoveFromGroup,
  handleCreateGroup: args.sequenceActions.handleCreateGroup,
  handleRenameGroup: args.sequenceActions.handleRenameGroup,
  handleUpdateGroupDebounce: args.sequenceActions.handleUpdateGroupDebounce,
  onCreateSkuAutoIncrementSequence: args.sequenceActions.handleCreateSkuAutoIncrementSequence,
  onCreateLatestPriceStockSequence: args.sequenceActions.handleCreateLatestPriceStockSequence,
  handleCreateNameLengthMirrorPattern: args.sequenceActions.handleCreateNameLengthMirrorPattern,
  handleCreateNameCategoryMirrorPattern: args.sequenceActions.handleCreateNameCategoryMirrorPattern,
  handleCreateStarGaterProducerPattern: args.sequenceActions.handleCreateStarGaterProducerPattern,
  handleCreateNameMirrorPolishSequence: args.sequenceActions.handleCreateNameMirrorPolishSequence,
  handleSaveSequenceGroup: args.sequenceActions.handleSaveSequenceGroup,
  handleUngroup: args.sequenceActions.handleUngroup,
});

const buildDraftSection = (args: ControllerValueArgs): Partial<ValidatorSettingsController> => ({
  patternToDelete: args.state.patternToDelete,
  setPatternToDelete: args.state.setPatternToDelete,
  groupDrafts: args.state.groupDrafts,
  setGroupDrafts: args.state.setGroupDrafts,
  getGroupDraft: args.getGroupDraft,
});

export function buildValidatorSettingsControllerValue(
  args: ControllerValueArgs
): ValidatorSettingsController {
  const value: ValidatorSettingsController = {
    ...buildStatusSection(args),
    ...buildModalSection(args),
    ...args.patternPersistenceActions,
    ...args.settingsActions,
    ...args.patternModalActions,
    ...buildHelperSection(),
    ...buildDragSection(args),
    ...buildSequenceSection(args),
    ...buildDraftSection(args),
    openCreate: args.patternModalActions.handleAddPattern,
    openEdit: args.patternModalActions.handleEditPattern,
  };

  return value;
}

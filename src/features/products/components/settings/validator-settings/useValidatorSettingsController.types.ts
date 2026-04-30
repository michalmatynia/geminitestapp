import type { Dispatch, SetStateAction } from 'react';

import type { IdDataDto } from '@/shared/contracts/base';
import type { ValidatorSettingsController, PatternFormData } from '@/shared/contracts/products/drafts';
import type {
  CreateProductValidationPatternInput as CreateValidationPatternPayload,
  ProductValidationPattern,
  ProductValidationSemanticState,
  ProductValidatorSettings,
  ReorderProductValidationPatternUpdate as ReorderValidationPatternUpdatePayload,
  SequenceGroupDraft,
  UpdateProductValidationPatternInput as UpdateValidationPatternPayload,
} from '@/shared/contracts/products/validation';
import type { CreateMutation, DeleteMutation, UpdateMutation } from '@/shared/contracts/ui/queries';
import type { Toast } from '@/shared/contracts/ui/base';

export type ValidatorControllerState = {
  showModal: boolean;
  setShowModal: Dispatch<SetStateAction<boolean>>;
  closeModal: () => void;
  editingPattern: ProductValidationPattern | null;
  setEditingPattern: Dispatch<SetStateAction<ProductValidationPattern | null>>;
  modalSemanticStateSeed: ProductValidationSemanticState | null;
  setModalSemanticState: Dispatch<SetStateAction<ProductValidationSemanticState | null>>;
  formData: PatternFormData;
  setFormData: Dispatch<SetStateAction<PatternFormData>>;
  simulatorScope: ValidatorSettingsController['simulatorScope'];
  setSimulatorScope: ValidatorSettingsController['setSimulatorScope'];
  simulatorValues: Record<string, string>;
  setSimulatorValue: ValidatorSettingsController['setSimulatorValue'];
  simulatorCategoryFixtures: string;
  setSimulatorCategoryFixtures: ValidatorSettingsController['setSimulatorCategoryFixtures'];
  groupDrafts: Record<string, SequenceGroupDraft>;
  setGroupDrafts: Dispatch<SetStateAction<Record<string, SequenceGroupDraft>>>;
  draggedPatternId: string | null;
  setDraggedPatternId: Dispatch<SetStateAction<string | null>>;
  dragOverPatternId: string | null;
  setDragOverPatternId: Dispatch<SetStateAction<string | null>>;
  patternToDelete: ProductValidationPattern | null;
  setPatternToDelete: Dispatch<SetStateAction<ProductValidationPattern | null>>;
  resetSimulator: () => void;
};

export type ValidatorSettingsMutations = {
  createPattern: CreateMutation<ProductValidationPattern, CreateValidationPatternPayload>;
  updatePattern: UpdateMutation<
    ProductValidationPattern,
    IdDataDto<UpdateValidationPatternPayload>
  >;
  deletePattern: DeleteMutation;
  reorderPatterns: UpdateMutation<
    { updated: ProductValidationPattern[] },
    { updates: ReorderValidationPatternUpdatePayload[] }
  >;
  updateSettings: UpdateMutation<ProductValidatorSettings, Partial<ProductValidatorSettings>>;
};

export type ValidatorPatternModalActions = Pick<
  ValidatorSettingsController,
  'handleAddPattern' | 'handleEditPattern' | 'handleDuplicatePattern'
>;

export type ValidatorPatternPersistenceActions = Pick<
  ValidatorSettingsController,
  'handleSave' | 'handleSavePattern' | 'handleTogglePattern' | 'handleDeletePattern'
>;

export type ValidatorSettingsActions = Pick<
  ValidatorSettingsController,
  | 'handleUpdateSettings'
  | 'handleToggleDefault'
  | 'handleToggleFormatterDefault'
  | 'handleInstanceBehaviorChange'
>;

export type ValidatorReorderActions = Pick<
  ValidatorSettingsController,
  'handleDragStart' | 'handleDrop' | 'handlePatternDrop' | 'handleReorderInGroup'
>;

export type ValidatorToast = Toast;

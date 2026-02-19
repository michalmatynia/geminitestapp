import type {
  ProductReplacementModeDto,
  ProductValidationPatternFormDataDto,
  ProductValidationSequenceGroupDraftDto,
  ProductValidationSequenceGroupDto,
} from '@/shared/contracts/products';
import type {
  ProductValidationPattern,
  ProductValidatorSettings,
  ProductValidationInstanceDenyBehaviorMap,
  ProductValidationInstanceScope,
  ProductValidationDenyBehavior,
} from '@/shared/types/domain/products';

export type ReplacementMode = ProductReplacementModeDto;

export type SequenceGroupDraft = ProductValidationSequenceGroupDraftDto;

export type SequenceGroupView = ProductValidationSequenceGroupDto;

export type PatternFormData = ProductValidationPatternFormDataDto;

export interface ValidatorSettingsController {
  patterns: ProductValidationPattern[];
  settings: ProductValidatorSettings | undefined;
  summary: {
    total: number;
    enabled: number;
    replacementEnabled: number;
  };
  orderedPatterns: ProductValidationPattern[];
  enabledByDefault: boolean;
  instanceDenyBehavior: ProductValidationInstanceDenyBehaviorMap;
  loading: boolean;
  isUpdating: boolean;
  settingsBusy: boolean;
  patternActionsPending: boolean;
  reorderPending: boolean;
  showModal: boolean;
  setShowModal: (show: boolean) => void;
  closeModal: () => void;
  editingPattern: ProductValidationPattern | null;
  formData: PatternFormData;
  setFormData: React.Dispatch<React.SetStateAction<PatternFormData>>;
  testResult: unknown;
  handleSave: () => Promise<void>;
  handleSavePattern: () => Promise<void>;
  handleTogglePattern: (pattern: ProductValidationPattern) => Promise<void>;
  handleDeletePattern: (id: string) => Promise<void>;
  handleUpdateSettings: (updates: Partial<{ enabledByDefault: boolean; instanceDenyBehavior: ProductValidationInstanceDenyBehaviorMap }>) => Promise<void>;
  handleToggleDefault: (enabled: boolean) => Promise<void>;
  handleInstanceBehaviorChange: (scope: ProductValidationInstanceScope, behavior: ProductValidationDenyBehavior) => Promise<void>;
  handleEditPattern: (pattern: ProductValidationPattern) => void;
  handleDuplicatePattern: (pattern: ProductValidationPattern) => void;
  handleAddPattern: (target?: string) => void;
  handleDragStart: (e: React.DragEvent, patternId: string) => void;
  handleDrop: (pattern: ProductValidationPattern, e: React.DragEvent) => void;
  replacementFieldOptions: Array<{ value: string; label: string }>;
  sourceFieldOptions: Array<{ value: string; label: string }>;
  createPatternPending: boolean;
  updatePatternPending: boolean;
  isLocaleTarget: (target: string) => boolean;
  normalizeReplacementFields: (fields: string[], target: string) => string[];
  getReplacementFieldsForTarget: (target: string) => Array<{ value: string; label: string }>;
  getSourceFieldOptionsForTarget: (target: string) => Array<{ value: string; label: string }>;
  formatReplacementFields: (fields: string[]) => string;
  draggedPatternId: string | null;
  setDraggedPatternId: (id: string | null) => void;
  dragOverPatternId: string | null;
  setDragOverPatternId: (id: string | null) => void;
  handlePatternDrop: (pattern: ProductValidationPattern, e: React.DragEvent) => void;
  sequenceGroups: Map<string, SequenceGroupView>;
  firstPatternIdByGroup: Map<string, string>;
  getSequenceGroupId: (p: ProductValidationPattern) => string | null;
  handleMoveGroup: (groupId: string, targetIndex: number) => Promise<void>;
  handleReorderInGroup: (groupId: string, patternId: string, targetIndex: number) => Promise<void>;
  handleMoveToGroup: (patternId: string, targetGroupId: string, targetIndex: number) => Promise<void>;
  handleRemoveFromGroup: (patternId: string) => Promise<void>;
  handleCreateGroup: (patternIds: string[], label: string) => Promise<void>;
  handleRenameGroup: (groupId: string, newLabel: string) => Promise<void>;
  handleUpdateGroupDebounce: (groupId: string, debounceMs: number) => Promise<void>;
  onCreateSkuAutoIncrementSequence: () => Promise<void>;
  onCreateLatestPriceStockSequence: () => Promise<void>;
  handleCreateNameLengthMirrorPattern: () => Promise<void>;
  handleCreateNameCategoryMirrorPattern: () => Promise<void>;
  handleCreateNameMirrorPolishSequence: () => Promise<void>;
  handleSaveSequenceGroup: (groupId: string) => Promise<void>;
  handleUngroup: (groupId: string) => Promise<void>;
  patternToDelete: ProductValidationPattern | null;
  setPatternToDelete: (pattern: ProductValidationPattern | null) => void;
  groupDrafts: Record<string, SequenceGroupDraft>;
  setGroupDrafts: React.Dispatch<React.SetStateAction<Record<string, SequenceGroupDraft>>>;
  getGroupDraft: (groupId: string) => SequenceGroupDraft;
  openCreate: (target?: string) => void;
  openEdit: (pattern: ProductValidationPattern) => void;
}

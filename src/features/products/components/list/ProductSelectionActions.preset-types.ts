import type { RefObject } from 'react';

import type {
  ProductAdvancedFilterGroup,
  ProductAdvancedFilterPreset,
} from '@/shared/contracts/products/filters';

import type {
  ProductSelectionPresetDialogMode,
  ProductSelectionToast,
} from './ProductSelectionActions.types';

export type PresetControllerInput = {
  activeAdvancedFilterPresetId: string | null;
  advancedFilter: string;
  advancedFilterPresets: ProductAdvancedFilterPreset[];
  setAdvancedFilterPresets: (presets: ProductAdvancedFilterPreset[]) => Promise<void>;
  setAdvancedFilterState: (value: string, presetId: string | null) => void;
  toast: ProductSelectionToast;
};

export type PresetDialogState = {
  editingPresetId: string | null;
  isPresetDialogOpen: boolean;
  presetDialogMode: ProductSelectionPresetDialogMode;
  presetFilterDraft: ProductAdvancedFilterGroup | null;
  presetName: string;
  savingPreset: boolean;
  setEditingPresetId: (value: string | null) => void;
  setIsPresetDialogOpen: (value: boolean) => void;
  setPresetDialogMode: (value: ProductSelectionPresetDialogMode) => void;
  setPresetFilterDraft: (value: ProductAdvancedFilterGroup | null) => void;
  setPresetName: (value: string) => void;
  setSavingPreset: (value: boolean) => void;
};

export type ImportDialogState = {
  importFileInputRef: RefObject<HTMLInputElement | null>;
  importingPresets: boolean;
  isImportDialogOpen: boolean;
  setImportingPresets: (value: boolean) => void;
  setImportDialogOpen: (value: boolean) => void;
};

export type SavePresetInput = Pick<
  PresetControllerInput,
  | 'activeAdvancedFilterPresetId'
  | 'advancedFilterPresets'
  | 'setAdvancedFilterPresets'
  | 'setAdvancedFilterState'
  | 'toast'
> &
  Pick<
    PresetDialogState,
    'editingPresetId' | 'presetDialogMode' | 'presetFilterDraft'
  > & {
    closePresetDialog: () => void;
    currentAdvancedFilterGroup: ProductAdvancedFilterGroup | null;
    setSavingPreset: (value: boolean) => void;
    trimmedName: string;
  };

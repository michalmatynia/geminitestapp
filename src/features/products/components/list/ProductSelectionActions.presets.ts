'use client';

import { useCallback, useMemo, useRef, useState } from 'react';

import {
  findPresetById,
  parseAdvancedFilterPayload,
} from '@/features/products/components/list/advanced-filter';
import type { ProductAdvancedFilterGroup } from '@/shared/contracts/products/filters';

import { getPresetSubmitLabel } from './ProductSelectionActions.helpers';
import { resetPresetDialog, usePresetHandlers } from './ProductSelectionActions.preset-handlers';
import type {
  ImportDialogState,
  PresetControllerInput,
  PresetDialogState,
} from './ProductSelectionActions.preset-types';
import type {
  ProductSelectionPresetController,
  ProductSelectionPresetDialogMode,
} from './ProductSelectionActions.types';

const usePresetDialogState = (): PresetDialogState => {
  const [isPresetDialogOpen, setIsPresetDialogOpen] = useState(false);
  const [presetDialogMode, setPresetDialogMode] =
    useState<ProductSelectionPresetDialogMode>('create');
  const [editingPresetId, setEditingPresetId] = useState<string | null>(null);
  const [presetName, setPresetName] = useState('');
  const [presetFilterDraft, setPresetFilterDraft] = useState<ProductAdvancedFilterGroup | null>(
    null
  );
  const [savingPreset, setSavingPreset] = useState(false);

  return {
    editingPresetId,
    isPresetDialogOpen,
    presetDialogMode,
    presetFilterDraft,
    presetName,
    savingPreset,
    setEditingPresetId,
    setIsPresetDialogOpen,
    setPresetDialogMode,
    setPresetFilterDraft,
    setPresetName,
    setSavingPreset,
  };
};

const useImportDialogState = (): ImportDialogState => {
  const [isImportDialogOpen, setImportDialogOpen] = useState(false);
  const [importingPresets, setImportingPresets] = useState(false);
  const importFileInputRef = useRef<HTMLInputElement>(null);

  return {
    importFileInputRef,
    importingPresets,
    isImportDialogOpen,
    setImportDialogOpen,
    setImportingPresets,
  };
};

export const useProductSelectionPresetController = ({
  activeAdvancedFilterPresetId,
  advancedFilter,
  advancedFilterPresets,
  setAdvancedFilterPresets,
  setAdvancedFilterState,
  toast,
}: PresetControllerInput): ProductSelectionPresetController => {
  const dialog = usePresetDialogState();
  const importDialog = useImportDialogState();
  const currentAdvancedFilterGroup = useMemo(
    () => parseAdvancedFilterPayload(advancedFilter),
    [advancedFilter]
  );
  const activePreset = useMemo(() => {
    if (activeAdvancedFilterPresetId === null || activeAdvancedFilterPresetId.length === 0) {
      return null;
    }
    return findPresetById(advancedFilterPresets, activeAdvancedFilterPresetId);
  }, [activeAdvancedFilterPresetId, advancedFilterPresets]);
  const closePresetDialog = useCallback((): void => resetPresetDialog(dialog), [dialog]);
  const closeImportDialog = useCallback((): void => {
    importDialog.setImportDialogOpen(false);
    importDialog.setImportingPresets(false);
  }, [importDialog]);
  const handlers = usePresetHandlers({
    activeAdvancedFilterPresetId,
    advancedFilterPresets,
    closeImportDialog,
    closePresetDialog,
    currentAdvancedFilterGroup,
    dialog,
    importDialog,
    setAdvancedFilterPresets,
    setAdvancedFilterState,
    toast,
  });

  return {
    activeAdvancedFilterPresetId,
    activePreset,
    advancedFilterPresets,
    closeImportDialog,
    closePresetDialog,
    currentAdvancedFilterGroup,
    importFileInputRef: importDialog.importFileInputRef,
    importingPresets: importDialog.importingPresets,
    isImportDialogOpen: importDialog.isImportDialogOpen,
    presetDialogSubmitLabel: getPresetSubmitLabel(
      dialog.savingPreset,
      dialog.presetDialogMode
    ),
    setAdvancedFilterState,
    setImportDialogOpen: importDialog.setImportDialogOpen,
    ...dialog,
    ...handlers,
  };
};

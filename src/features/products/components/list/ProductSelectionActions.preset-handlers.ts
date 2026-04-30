'use client';

import { useCallback, type ChangeEvent } from 'react';

import type { ProductAdvancedFilterPreset } from '@/shared/contracts/products/filters';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

import {
  buildPresetBundle,
  downloadJsonFile,
  mapImportedPresets,
  normalizePresetName,
  parsePresetImportPayload,
  slugifyPresetFilename,
  writeToClipboard,
} from './product-filters-utils';
import { cloneAdvancedFilterGroup } from './ProductSelectionActions.helpers';
import { savePresetDialog } from './ProductSelectionActions.preset-save';
import type {
  ImportDialogState,
  PresetControllerInput,
  PresetDialogState,
} from './ProductSelectionActions.preset-types';
import type { ProductSelectionPresetController } from './ProductSelectionActions.types';

type PresetHandlersInput = Pick<
  PresetControllerInput,
  | 'activeAdvancedFilterPresetId'
  | 'advancedFilterPresets'
  | 'setAdvancedFilterPresets'
  | 'setAdvancedFilterState'
  | 'toast'
> & {
  closeImportDialog: () => void;
  closePresetDialog: () => void;
  currentAdvancedFilterGroup: ProductSelectionPresetController['currentAdvancedFilterGroup'];
  dialog: PresetDialogState;
  importDialog: ImportDialogState;
};

type PresetHandlers = Pick<
  ProductSelectionPresetController,
  | 'handleApplyPreset'
  | 'handleCopyAllPresets'
  | 'handleCopyPreset'
  | 'handleDeletePreset'
  | 'handleExportAllPresets'
  | 'handleExportSinglePreset'
  | 'handleImportFromDialog'
  | 'handleImportFromFile'
  | 'handleSavePresetDialog'
  | 'openCreatePresetDialog'
  | 'openEditPresetDialog'
>;

export const resetPresetDialog = (dialog: PresetDialogState): void => {
  dialog.setIsPresetDialogOpen(false);
  dialog.setEditingPresetId(null);
  dialog.setPresetName('');
  dialog.setPresetFilterDraft(null);
  dialog.setSavingPreset(false);
};

const usePresetDialogHandlers = ({
  currentAdvancedFilterGroup,
  dialog,
  toast,
}: Pick<PresetHandlersInput, 'currentAdvancedFilterGroup' | 'dialog' | 'toast'>): Pick<
  PresetHandlers,
  'openCreatePresetDialog' | 'openEditPresetDialog'
> => {
  const openCreatePresetDialog = useCallback((): void => {
    if (currentAdvancedFilterGroup === null) {
      toast('Apply an advanced filter before saving a preset.', { variant: 'error' });
      return;
    }
    dialog.setPresetDialogMode('create');
    dialog.setEditingPresetId(null);
    dialog.setPresetName('');
    dialog.setPresetFilterDraft(null);
    dialog.setIsPresetDialogOpen(true);
  }, [currentAdvancedFilterGroup, dialog, toast]);

  const openEditPresetDialog = useCallback((preset: ProductAdvancedFilterPreset): void => {
    dialog.setPresetDialogMode('edit');
    dialog.setEditingPresetId(preset.id);
    dialog.setPresetName(preset.name);
    dialog.setPresetFilterDraft(cloneAdvancedFilterGroup(preset.filter));
    dialog.setIsPresetDialogOpen(true);
  }, [dialog]);

  return { openCreatePresetDialog, openEditPresetDialog };
};

const usePresetCrudHandlers = ({
  activeAdvancedFilterPresetId,
  advancedFilterPresets,
  setAdvancedFilterPresets,
  setAdvancedFilterState,
  toast,
}: PresetHandlersInput): Pick<
  PresetHandlers,
  'handleApplyPreset' | 'handleDeletePreset'
> => {
  const handleApplyPreset = useCallback((preset: ProductAdvancedFilterPreset): void => {
    setAdvancedFilterState(JSON.stringify(preset.filter), preset.id);
    toast(`Applied preset "${preset.name}".`, { variant: 'success' });
  }, [setAdvancedFilterState, toast]);

  const handleDeletePreset = useCallback(async (preset: ProductAdvancedFilterPreset): Promise<void> => {
    try {
      await setAdvancedFilterPresets(
        advancedFilterPresets.filter((entry) => entry.id !== preset.id)
      );
      if (activeAdvancedFilterPresetId === preset.id) {
        setAdvancedFilterState('', null);
      }
      toast(`Deleted preset "${preset.name}".`, { variant: 'success' });
    } catch (error) {
      logClientError(error);
      toast(error instanceof Error ? error.message : 'Failed to delete preset.', {
        variant: 'error',
      });
    }
  }, [
    activeAdvancedFilterPresetId,
    advancedFilterPresets,
    setAdvancedFilterPresets,
    setAdvancedFilterState,
    toast,
  ]);

  return { handleApplyPreset, handleDeletePreset };
};

const usePresetExportHandlers = ({
  advancedFilterPresets,
  toast,
}: PresetHandlersInput): Pick<
  PresetHandlers,
  'handleCopyAllPresets' | 'handleCopyPreset' | 'handleExportAllPresets' | 'handleExportSinglePreset'
> => {
  const handleExportAllPresets = useCallback((): void => {
    if (advancedFilterPresets.length === 0) {
      toast('No presets to export.', { variant: 'error' });
      return;
    }
    downloadJsonFile('advanced-filter-presets.bundle.json', buildPresetBundle(advancedFilterPresets));
  }, [advancedFilterPresets, toast]);

  const handleExportSinglePreset = useCallback((preset: ProductAdvancedFilterPreset): void => {
    downloadJsonFile(`advanced-filter-preset-${slugifyPresetFilename(preset.name)}.json`, preset);
  }, []);

  const handleCopyAllPresets = useCallback(async (): Promise<void> => {
    if (advancedFilterPresets.length === 0) {
      toast('No presets to copy.', { variant: 'error' });
      return;
    }
    await copyPresetJson(JSON.stringify(buildPresetBundle(advancedFilterPresets), null, 2), {
      failureMessage: 'Failed to copy presets JSON.',
      successMessage: 'Copied all presets JSON to clipboard.',
      toast,
    });
  }, [advancedFilterPresets, toast]);

  const handleCopyPreset = useCallback(
    async (preset: ProductAdvancedFilterPreset): Promise<void> => {
      await copyPresetJson(JSON.stringify(preset, null, 2), {
        failureMessage: 'Failed to copy preset JSON.',
        successMessage: `Copied preset "${preset.name}" JSON to clipboard.`,
        toast,
      });
    },
    [toast]
  );

  return { handleCopyAllPresets, handleCopyPreset, handleExportAllPresets, handleExportSinglePreset };
};

const copyPresetJson = async (
  payload: string,
  messages: { failureMessage: string; successMessage: string; toast: PresetControllerInput['toast'] }
): Promise<void> => {
  try {
    await writeToClipboard(payload);
    messages.toast(messages.successMessage, { variant: 'success' });
  } catch (error) {
    logClientError(error);
    messages.toast(error instanceof Error ? error.message : messages.failureMessage, {
      variant: 'error',
    });
  }
};

const importPresets = async ({
  advancedFilterPresets,
  payload,
  setAdvancedFilterPresets,
  toast,
}: Pick<PresetHandlersInput, 'advancedFilterPresets' | 'setAdvancedFilterPresets' | 'toast'> & {
  payload: unknown;
}): Promise<void> => {
  const parsedPresets = parsePresetImportPayload(payload);
  if (parsedPresets === null || parsedPresets.length === 0) {
    throw new Error('Invalid preset payload. Provide a preset object, preset list, or bundle JSON.');
  }
  const mergedImportedPresets = mapImportedPresets(advancedFilterPresets, parsedPresets);
  await setAdvancedFilterPresets([...advancedFilterPresets, ...mergedImportedPresets]);
  toast(`Imported ${mergedImportedPresets.length} preset(s).`, { variant: 'success' });
};

const usePresetImportHandlers = ({
  advancedFilterPresets,
  closeImportDialog,
  importDialog,
  setAdvancedFilterPresets,
  toast,
}: PresetHandlersInput): Pick<
  PresetHandlers,
  'handleImportFromDialog' | 'handleImportFromFile'
> => {
  const handleImportFromDialog = useCallback(async (value: string): Promise<void> => {
    if (value.trim().length === 0) {
      toast('Paste JSON to import.', { variant: 'error' });
      return;
    }
    try {
      importDialog.setImportingPresets(true);
      await importPresets({
        advancedFilterPresets,
        payload: JSON.parse(value),
        setAdvancedFilterPresets,
        toast,
      });
      closeImportDialog();
    } catch (error) {
      logClientError(error);
      toast(error instanceof Error ? error.message : 'Failed to import presets.', {
        variant: 'error',
      });
    } finally {
      importDialog.setImportingPresets(false);
    }
  }, [advancedFilterPresets, closeImportDialog, importDialog, setAdvancedFilterPresets, toast]);

  const handleImportFromFile = useCallback(async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (file === undefined) return;
    try {
      await importPresets({
        advancedFilterPresets,
        payload: JSON.parse(await file.text()),
        setAdvancedFilterPresets,
        toast,
      });
    } catch (error) {
      logClientError(error);
      toast(error instanceof Error ? error.message : 'Failed to import presets from file.', {
        variant: 'error',
      });
    } finally {
      input.value = '';
    }
  }, [advancedFilterPresets, setAdvancedFilterPresets, toast]);

  return { handleImportFromDialog, handleImportFromFile };
};

const usePresetSaveHandler = (input: PresetHandlersInput): Pick<
  PresetHandlers,
  'handleSavePresetDialog'
> => {
  const handleSavePresetDialog = useCallback(async (): Promise<void> => {
    await savePresetDialog({
      ...input,
      ...input.dialog,
      trimmedName: normalizePresetName(input.dialog.presetName),
    });
  }, [input]);
  return { handleSavePresetDialog };
};

export const usePresetHandlers = (input: PresetHandlersInput): PresetHandlers => ({
  ...usePresetCrudHandlers(input),
  ...usePresetDialogHandlers(input),
  ...usePresetExportHandlers(input),
  ...usePresetImportHandlers(input),
  ...usePresetSaveHandler(input),
});

import { findPresetById } from '@/features/products/components/list/advanced-filter';
import {
  productAdvancedFilterGroupSchema,
  type ProductAdvancedFilterGroup,
  type ProductAdvancedFilterPreset,
} from '@/shared/contracts/products/filters';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

import {
  createAdvancedPreset,
  hasPresetNameConflict,
} from './product-filters-utils';
import type { SavePresetInput } from './ProductSelectionActions.preset-types';

const saveCreatedPreset = async ({
  advancedFilterPresets,
  currentAdvancedFilterGroup,
  setAdvancedFilterPresets,
  toast,
  trimmedName,
}: Pick<
  SavePresetInput,
  | 'advancedFilterPresets'
  | 'currentAdvancedFilterGroup'
  | 'setAdvancedFilterPresets'
  | 'toast'
  | 'trimmedName'
>): Promise<boolean> => {
  if (currentAdvancedFilterGroup === null) {
    toast('Current advanced filter is invalid.', { variant: 'error' });
    return false;
  }
  if (hasPresetNameConflict(advancedFilterPresets, trimmedName)) {
    toast('Preset name already exists. Choose a unique name.', { variant: 'error' });
    return false;
  }
  const preset = createAdvancedPreset(trimmedName, currentAdvancedFilterGroup);
  await setAdvancedFilterPresets([...advancedFilterPresets, preset]);
  toast(`Saved preset "${trimmedName}".`, { variant: 'success' });
  return true;
};

const updateEditedPreset = (
  presets: ProductAdvancedFilterPreset[],
  editingPresetId: string,
  trimmedName: string,
  filter: ProductAdvancedFilterGroup
): ProductAdvancedFilterPreset[] => {
  const now = new Date().toISOString();
  return presets.map((preset) =>
    preset.id === editingPresetId
      ? { ...preset, name: trimmedName, filter, updatedAt: now }
      : preset
  );
};

const getEditingPresetId = (
  input: SavePresetInput
): string | null => {
  if (input.editingPresetId === null || input.editingPresetId.trim().length === 0) {
    input.toast('Preset to edit was not found.', { variant: 'error' });
    return null;
  }
  return input.editingPresetId;
};

const getEditablePresetFilter = (
  input: SavePresetInput,
  editingPresetId: string
): ProductAdvancedFilterGroup | null => {
  const editingPreset = findPresetById(input.advancedFilterPresets, editingPresetId);
  if (editingPreset === null || input.presetFilterDraft === null) {
    input.toast('Preset to edit was not found.', { variant: 'error' });
    return null;
  }
  return input.presetFilterDraft;
};

const parsePresetFilterDraft = (
  input: SavePresetInput,
  presetFilterDraft: ProductAdvancedFilterGroup
): ProductAdvancedFilterGroup | null => {
  const parsedFilter = productAdvancedFilterGroupSchema.safeParse(presetFilterDraft);
  if (!parsedFilter.success) {
    input.toast(parsedFilter.error.issues[0]?.message ?? 'Preset filter has invalid rules.', {
      variant: 'error',
    });
    return null;
  }
  return parsedFilter.data;
};

const saveEditedPreset = async (input: SavePresetInput): Promise<boolean> => {
  const {
    activeAdvancedFilterPresetId,
    advancedFilterPresets,
    setAdvancedFilterPresets,
    setAdvancedFilterState,
    trimmedName,
  } = input;
  const editingPresetId = getEditingPresetId(input);
  if (editingPresetId === null) return false;
  const presetFilterDraft = getEditablePresetFilter(input, editingPresetId);
  if (presetFilterDraft === null) return false;
  if (hasPresetNameConflict(advancedFilterPresets, trimmedName, editingPresetId)) {
    input.toast('Preset name already exists. Choose a unique name.', { variant: 'error' });
    return false;
  }
  const parsedFilter = parsePresetFilterDraft(input, presetFilterDraft);
  if (parsedFilter === null) return false;
  const nextPresets = updateEditedPreset(
    advancedFilterPresets,
    editingPresetId,
    trimmedName,
    parsedFilter
  );
  await setAdvancedFilterPresets(nextPresets);
  if (activeAdvancedFilterPresetId === editingPresetId) {
    setAdvancedFilterState(JSON.stringify(parsedFilter), editingPresetId);
  }
  input.toast(`Updated preset "${trimmedName}".`, { variant: 'success' });
  return true;
};

export const savePresetDialog = async (input: SavePresetInput): Promise<void> => {
  if (input.trimmedName.length === 0) {
    input.toast('Preset name is required.', { variant: 'error' });
    return;
  }
  input.setSavingPreset(true);
  try {
    const saved =
      input.presetDialogMode === 'create'
        ? await saveCreatedPreset(input)
        : await saveEditedPreset(input);
    if (saved) input.closePresetDialog();
  } catch (error) {
    logClientError(error);
    input.toast(error instanceof Error ? error.message : 'Failed to save preset.', {
      variant: 'error',
    });
  } finally {
    input.setSavingPreset(false);
  }
};

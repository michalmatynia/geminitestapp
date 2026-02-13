'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { useSettingsMap, useUpdateSetting } from '@/shared/hooks/use-settings';
import {
  UnifiedButton,
  UnifiedInput,
  Label,
  UnifiedSelect,
  useToast,
} from '@/shared/ui';
import { parseJsonSetting, serializeSetting } from '@/shared/utils/settings-json';

import { usePromptState, usePromptActions } from '../context/PromptContext';
import { IMAGE_STUDIO_UI_ACTIVE_KEY, IMAGE_STUDIO_UI_PRESETS_KEY, parseImageStudioUiPresets, type ImageStudioUiPreset } from '../utils/ui-presets';

function cloneSettingValue<T>(value: T): T {
  try {
    return JSON.parse(JSON.stringify(value)) as T;
  } catch {
    return value;
  }
}

export function UIPresetsPanel(): React.JSX.Element {
  const { paramsState, paramSpecs, paramUiOverrides } = usePromptState();
  const { setParamsState, setParamSpecs, setParamUiOverrides } = usePromptActions();
  const { toast } = useToast();
  const heavySettings = useSettingsMap({ scope: 'heavy' });
  const updateSetting = useUpdateSetting();

  const [selectedPresetId, setSelectedPresetId] = useState<string>('');
  const [uiPresetNameDraft, setUiPresetNameDraft] = useState('');
  const [uiPresetDescriptionDraft, setUiPresetDescriptionDraft] = useState('');

  const heavyMap = heavySettings.data ?? new Map<string, string>();
  const uiPresets = useMemo<ImageStudioUiPreset[]>(
    () => parseImageStudioUiPresets(heavyMap.get(IMAGE_STUDIO_UI_PRESETS_KEY)),
    [heavyMap]
  );
  const activePresetId = useMemo(
    () => parseJsonSetting<string | null>(heavyMap.get(IMAGE_STUDIO_UI_ACTIVE_KEY), null) ?? '',
    [heavyMap]
  );
  const activePreset = useMemo(
    () => uiPresets.find((preset: ImageStudioUiPreset) => preset.id === activePresetId) ?? null,
    [uiPresets, activePresetId]
  );
  const presetOptions = useMemo(
    () => ([
      { value: '__none__', label: 'Choose preset' },
      ...uiPresets.map((preset: ImageStudioUiPreset) => ({ value: preset.id, label: preset.name })),
    ]),
    [uiPresets]
  );

  useEffect(() => {
    if (selectedPresetId) return;
    if (!activePresetId) return;
    setSelectedPresetId(activePresetId);
  }, [activePresetId, selectedPresetId]);

  const handleApplyPreset = useCallback((presetId: string): void => {
    const preset = uiPresets.find((item: ImageStudioUiPreset) => item.id === presetId);
    if (!preset) {
      toast('Preset not found.', { variant: 'error' });
      return;
    }
    setParamsState(cloneSettingValue(preset.params));
    setParamSpecs(preset.paramSpecs ? cloneSettingValue(preset.paramSpecs) : null);
    setParamUiOverrides(preset.paramUiOverrides ? cloneSettingValue(preset.paramUiOverrides) : {});
    toast(`Applied preset: ${preset.name}`, { variant: 'success' });
  }, [setParamsState, setParamSpecs, setParamUiOverrides, toast, uiPresets]);

  const handleSetActivePreset = useCallback(async (presetId: string): Promise<void> => {
    await updateSetting.mutateAsync({
      key: IMAGE_STUDIO_UI_ACTIVE_KEY,
      value: serializeSetting(presetId || null),
    });
  }, [updateSetting]);

  const handleSavePreset = useCallback(async (): Promise<void> => {
    if (!paramsState) {
      toast('Extract params first to save a UI preset.', { variant: 'info' });
      return;
    }

    const now = new Date().toISOString();
    const existing = selectedPresetId
      ? uiPresets.find((preset: ImageStudioUiPreset) => preset.id === selectedPresetId) ?? null
      : null;
    const id = existing?.id
      ?? (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `preset_${Date.now().toString(36)}`);
    const name = uiPresetNameDraft.trim() || existing?.name || `Preset ${uiPresets.length + 1}`;
    const description = uiPresetDescriptionDraft.trim() || existing?.description || null;

    const nextPreset: ImageStudioUiPreset = {
      id,
      name,
      description,
      params: cloneSettingValue(paramsState),
      ...(paramSpecs ? { paramSpecs: cloneSettingValue(paramSpecs) } : {}),
      ...(paramUiOverrides ? { paramUiOverrides: cloneSettingValue(paramUiOverrides) } : {}),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };

    const nextList = existing
      ? uiPresets.map((preset: ImageStudioUiPreset) => (preset.id === id ? nextPreset : preset))
      : [nextPreset, ...uiPresets];

    try {
      await updateSetting.mutateAsync({
        key: IMAGE_STUDIO_UI_PRESETS_KEY,
        value: serializeSetting(nextList),
      });
      await handleSetActivePreset(id);
      setSelectedPresetId(id);
      setUiPresetNameDraft('');
      setUiPresetDescriptionDraft('');
      toast(existing ? 'UI preset updated.' : 'UI preset created.', { variant: 'success' });
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Failed to save UI preset.', { variant: 'error' });
    }
  }, [
    handleSetActivePreset,
    paramSpecs,
    paramUiOverrides,
    paramsState,
    selectedPresetId,
    toast,
    uiPresetDescriptionDraft,
    uiPresetNameDraft,
    uiPresets,
    updateSetting,
  ]);

  const handleDeletePreset = useCallback(async (): Promise<void> => {
    if (!selectedPresetId) return;
    const next = uiPresets.filter((preset: ImageStudioUiPreset) => preset.id !== selectedPresetId);
    try {
      await updateSetting.mutateAsync({
        key: IMAGE_STUDIO_UI_PRESETS_KEY,
        value: serializeSetting(next),
      });
      if (activePresetId === selectedPresetId) {
        await handleSetActivePreset('');
      }
      setSelectedPresetId('');
      toast('UI preset deleted.', { variant: 'success' });
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Failed to delete UI preset.', { variant: 'error' });
    }
  }, [activePresetId, handleSetActivePreset, selectedPresetId, toast, uiPresets, updateSetting]);

  return (
    <div className='grid grid-cols-1 gap-2 rounded border border-border/60 bg-card/40 p-2'>
      <div className='flex items-center justify-between gap-2'>
        <Label className='text-[11px] text-gray-300'>UI Presets</Label>
        <span className='text-[10px] text-gray-500'>
          {activePreset ? `Active: ${activePreset.name}` : 'No active preset'}
        </span>
      </div>
      <div className='grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_120px]'>
        <UnifiedSelect
          value={selectedPresetId || '__none__'}
          onValueChange={(value: string) => setSelectedPresetId(value === '__none__' ? '' : value)}
          options={presetOptions}
          placeholder='Choose preset'
          triggerClassName='h-8 text-xs'
          ariaLabel='Choose UI preset'
        />
        <UnifiedButton
          type='button'
          variant='outline'
          size='sm'
          onClick={() => {
            if (!selectedPresetId) return;
            handleApplyPreset(selectedPresetId);
          }}
          disabled={!selectedPresetId}
        >
          Apply
        </UnifiedButton>
      </div>
      <div className='grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]'>
        <UnifiedInput
          value={uiPresetNameDraft}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) => setUiPresetNameDraft(event.target.value)}
          placeholder='Preset name'
          className='h-8 text-xs'
        />
        <UnifiedInput
          value={uiPresetDescriptionDraft}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) => setUiPresetDescriptionDraft(event.target.value)}
          placeholder='Description (optional)'
          className='h-8 text-xs'
        />
      </div>
      <div className='flex flex-wrap items-center gap-2'>
        <UnifiedButton
          type='button'
          variant='outline'
          size='sm'
          onClick={() => { void handleSavePreset(); }}
          disabled={updateSetting.isPending}
        >
          {selectedPresetId ? 'Update Preset' : 'Save Preset'}
        </UnifiedButton>
        <UnifiedButton
          type='button'
          variant='outline'
          size='sm'
          onClick={() => {
            if (!selectedPresetId) return;
            void handleSetActivePreset(selectedPresetId).then(() => {
              toast('Active UI preset updated.', { variant: 'success' });
            }).catch((error: unknown) => {
              toast(error instanceof Error ? error.message : 'Failed to set active preset.', { variant: 'error' });
            });
          }}
          disabled={!selectedPresetId || updateSetting.isPending}
        >
          Set Active
        </UnifiedButton>
        <UnifiedButton
          type='button'
          variant='ghost'
          size='sm'
          onClick={() => { void handleDeletePreset(); }}
          disabled={!selectedPresetId || updateSetting.isPending}
        >
          Delete
        </UnifiedButton>
      </div>
    </div>
  );
}

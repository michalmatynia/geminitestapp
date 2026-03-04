'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { SelectSimple, Button, useToast } from '@/shared/ui';
import { StudioCard } from '../StudioCard';
import { useSettingsState, useSettingsActions } from '../../context/SettingsContext';
import {
  normalizeImageStudioSequenceSteps,
  type ImageStudioSequencePreset,
} from '@/features/ai/image-studio/utils/studio-settings';
import { PRESET_NAME_MAX_LENGTH } from './sequencing-constants';

const normalizePresetIdFragment = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 48);

const buildPresetId = (name: string, existingIds: Set<string>): string => {
  const baseFragment = normalizePresetIdFragment(name) || 'sequence_preset';
  const base = `preset_${baseFragment}`;
  if (!existingIds.has(base)) return base;
  let suffix = 2;
  let next = `${base}_${suffix}`;
  while (existingIds.has(next)) {
    suffix += 1;
    next = `${base}_${suffix}`;
  }
  return next;
};

export function SequencePresetsCard(): React.JSX.Element {
  const { toast } = useToast();
  const { studioSettings } = useSettingsState();
  const { setStudioSettings } = useSettingsActions();

  const [selectedPresetId, setSelectedPresetId] = useState<string>('');
  const [presetNameDraft, setPresetNameDraft] = useState<string>('');

  const sequencePresets = studioSettings.projectSequencing.presets;
  const sequencePresetOptions = useMemo(
    () => sequencePresets.map((preset) => ({ value: preset.id, label: preset.name })),
    [sequencePresets]
  );
  const selectedPreset = useMemo(
    () => sequencePresets.find((preset) => preset.id === selectedPresetId) ?? null,
    [sequencePresets, selectedPresetId]
  );

  useEffect(() => {
    if (sequencePresets.length === 0) {
      setSelectedPresetId('');
      return;
    }
    const hasCurrent = sequencePresets.some((preset) => preset.id === selectedPresetId);
    if (hasCurrent) return;
    const activePresetId = studioSettings.projectSequencing.activePresetId;
    if (activePresetId && sequencePresets.some((preset) => preset.id === activePresetId)) {
      setSelectedPresetId(activePresetId);
      return;
    }
    setSelectedPresetId(sequencePresets[0]?.id ?? '');
  }, [selectedPresetId, sequencePresets, studioSettings.projectSequencing.activePresetId]);

  useEffect(() => {
    if (selectedPreset) {
      setPresetNameDraft(selectedPreset.name);
    }
  }, [selectedPreset]);

  const handleSavePreset = useCallback((): void => {
    const name = presetNameDraft.trim();
    if (!name) {
      toast('Enter a preset name first.', { variant: 'info' });
      return;
    }

    const nextSteps = normalizeImageStudioSequenceSteps(studioSettings.projectSequencing.steps);
    const normalizedName = name.slice(0, PRESET_NAME_MAX_LENGTH);
    const timestamp = new Date().toISOString();
    let nextPresetId = '';

    setStudioSettings((prev) => {
      const existingPresets = Array.isArray(prev.projectSequencing.presets)
        ? prev.projectSequencing.presets
        : [];

      const byIdIndex = selectedPresetId
        ? existingPresets.findIndex((preset) => preset.id === selectedPresetId)
        : -1;
      const byNameIndex =
        byIdIndex >= 0
          ? -1
          : existingPresets.findIndex(
              (preset) => preset.name.trim().toLowerCase() === normalizedName.toLowerCase()
            );
      const targetIndex = byIdIndex >= 0 ? byIdIndex : byNameIndex;
      const existingIds = new Set(existingPresets.map((preset) => preset.id));
      nextPresetId =
        targetIndex >= 0
          ? existingPresets[targetIndex]!.id
          : buildPresetId(normalizedName, existingIds);

      const nextPreset: ImageStudioSequencePreset = {
        id: nextPresetId,
        name: normalizedName,
        description: null,
        steps: nextSteps,
        updatedAt: timestamp,
      };

      const nextPresets =
        targetIndex >= 0
          ? existingPresets.map((preset, index) => (index === targetIndex ? nextPreset : preset))
          : [nextPreset, ...existingPresets];

      return {
        ...prev,
        projectSequencing: {
          ...prev.projectSequencing,
          activePresetId: nextPresetId,
          steps: nextSteps,
          presets: nextPresets,
        },
      };
    });

    if (nextPresetId) {
      setSelectedPresetId(nextPresetId);
    }
    toast(`Saved preset "${normalizedName}".`, { variant: 'success' });
  }, [
    presetNameDraft,
    studioSettings.projectSequencing.steps,
    selectedPresetId,
    setStudioSettings,
    toast,
  ]);

  const handleLoadPreset = useCallback((): void => {
    if (!selectedPreset) {
      toast('Select a preset to load.', { variant: 'info' });
      return;
    }

    const nextSteps = normalizeImageStudioSequenceSteps(selectedPreset.steps);
    setStudioSettings((prev) => ({
      ...prev,
      projectSequencing: {
        ...prev.projectSequencing,
        activePresetId: selectedPreset.id,
        steps: nextSteps,
      },
    }));
    setSelectedPresetId(selectedPreset.id);
    toast(`Loaded preset "${selectedPreset.name}".`, { variant: 'success' });
  }, [selectedPreset, setStudioSettings, toast]);

  return (
    <StudioCard label='Presets' className='shrink-0'>
      <div className='space-y-2'>
        <input
          type='text'
          value={presetNameDraft}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
            setPresetNameDraft(event.target.value.slice(0, PRESET_NAME_MAX_LENGTH))
          }
          className='h-7 w-full rounded border border-border/60 bg-card/40 px-2 text-[11px] text-gray-100 outline-none'
          placeholder='Preset name'
          aria-label='Sequence preset name'
        />
        <div className='grid grid-cols-[repeat(auto-fit,minmax(136px,1fr))] gap-1.5'>
          <SelectSimple
            size='sm'
            value={selectedPresetId}
            onValueChange={(value: string) => setSelectedPresetId(value)}
            options={sequencePresetOptions}
            placeholder='Select sequence preset'
            triggerClassName='h-7 text-[11px]'
            ariaLabel='Sequence preset'
          />
          <Button
            size='xs'
            type='button'
            variant='outline'
            onClick={handleLoadPreset}
            disabled={!selectedPresetId}
          >
            Load Preset
          </Button>
          <Button
            size='xs'
            type='button'
            onClick={handleSavePreset}
            disabled={!presetNameDraft.trim()}
          >
            Save Preset
          </Button>
        </div>
        <div className='text-[11px] text-gray-500'>
          Presets can be loaded into the stack and updated by name.
        </div>
      </div>
    </StudioCard>
  );
}

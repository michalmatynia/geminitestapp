'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';

import {
  IMAGE_STUDIO_PROMPT_LIBRARY_KEY,
  parseImageStudioPromptLibrary,
  type ImageStudioPromptEntry,
} from '@/features/ai/image-studio/utils/prompt-library';
import { useSettingsMap, useUpdateSetting } from '@/shared/hooks/use-settings';
import { Button, Label, SelectSimple, useToast } from '@/shared/ui';
import { serializeSetting } from '@/shared/utils/settings-json';

import { usePromptState, usePromptActions } from '../context/PromptContext';

const CUSTOM_OPTION_VALUE = '__custom__';

function createPromptId(): string {
  return typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `prompt_${Date.now().toString(36)}`;
}

function createDefaultPromptName(entries: ImageStudioPromptEntry[]): string {
  const existing = new Set(
    entries.map((entry: ImageStudioPromptEntry) => entry.name.trim().toLowerCase())
  );
  let index = entries.length + 1;
  while (existing.has(`prompt ${index}`)) {
    index += 1;
  }
  return `Prompt ${index}`;
}

export function UIPresetsPanel(): React.JSX.Element {
  const { toast } = useToast();
  const updateSetting = useUpdateSetting();
  const { promptText } = usePromptState();
  const { setPromptText } = usePromptActions();
  const heavySettings = useSettingsMap({ scope: 'heavy' });
  const [selectedPromptId, setSelectedPromptId] = useState<string>('');
  const [customPromptSnapshot, setCustomPromptSnapshot] = useState<string | null>(null);
  const [saveAsNewBusy, setSaveAsNewBusy] = useState(false);

  const heavyMap = heavySettings.data ?? new Map<string, string>();
  const promptLibrary = useMemo<ImageStudioPromptEntry[]>(
    () => parseImageStudioPromptLibrary(heavyMap.get(IMAGE_STUDIO_PROMPT_LIBRARY_KEY)),
    [heavyMap]
  );

  const promptOptions = useMemo(
    () => [
      ...(customPromptSnapshot !== null ? [{ value: CUSTOM_OPTION_VALUE, label: 'Custom' }] : []),
      ...promptLibrary.map((entry: ImageStudioPromptEntry) => ({
        value: entry.id,
        label: entry.name,
      })),
    ],
    [customPromptSnapshot, promptLibrary]
  );

  useEffect(() => {
    if (!selectedPromptId) return;
    if (selectedPromptId === CUSTOM_OPTION_VALUE) return;
    if (promptLibrary.some((entry: ImageStudioPromptEntry) => entry.id === selectedPromptId))
      return;
    setSelectedPromptId('');
  }, [promptLibrary, selectedPromptId]);

  const handleSavePromptAsNew = useCallback((): void => {
    const trimmedPrompt = promptText.trim();
    if (!trimmedPrompt) {
      toast('Enter prompt text first.', { variant: 'info' });
      return;
    }
    if (saveAsNewBusy) return;

    const now = new Date().toISOString();
    const nextEntry: ImageStudioPromptEntry = {
      id: createPromptId(),
      name: createDefaultPromptName(promptLibrary),
      prompt: promptText,
      createdAt: now,
      updatedAt: now,
    };
    const nextLibrary = [nextEntry, ...promptLibrary];

    setSaveAsNewBusy(true);
    void updateSetting
      .mutateAsync({
        key: IMAGE_STUDIO_PROMPT_LIBRARY_KEY,
        value: serializeSetting(nextLibrary),
      })
      .then(() => {
        toast(`Saved "${nextEntry.name}" to prompt list.`, { variant: 'success' });
      })
      .catch((error: unknown) => {
        toast(
          error instanceof Error
            ? `Failed to save prompt: ${error.message}`
            : 'Failed to save prompt.',
          { variant: 'error' }
        );
      })
      .finally(() => {
        setSaveAsNewBusy(false);
      });
  }, [promptLibrary, promptText, saveAsNewBusy, toast, updateSetting]);

  return (
    <div className='grid grid-cols-1 gap-2 rounded border border-border/60 bg-card/40 p-2'>
      <div className='flex items-center justify-between gap-2'>
        <Label className='text-[11px] text-gray-300'>Prompt</Label>
        <span className='text-[10px] text-gray-500'>{promptLibrary.length} saved</span>
      </div>
      <SelectSimple
        size='sm'
        value={selectedPromptId}
        onValueChange={(value: string) => {
          if (value === CUSTOM_OPTION_VALUE) {
            if (customPromptSnapshot !== null) {
              setPromptText(customPromptSnapshot);
            }
            setSelectedPromptId(CUSTOM_OPTION_VALUE);
            return;
          }

          const selected = promptLibrary.find(
            (entry: ImageStudioPromptEntry) => entry.id === value
          );
          if (!selected) {
            setSelectedPromptId('');
            return;
          }
          if (customPromptSnapshot === null) {
            setCustomPromptSnapshot(promptText);
          }
          setPromptText(selected.prompt);
          setSelectedPromptId(selected.id);
        }}
        options={promptOptions}
        placeholder='Choose prompt'
        triggerClassName='h-8 text-xs'
        ariaLabel='Choose prompt'
      />
      <div className='flex justify-end'>
        <Button
          size='xs'
          type='button'
          variant='outline'
          onClick={handleSavePromptAsNew}
          disabled={saveAsNewBusy || !promptText.trim()}
        >
          {saveAsNewBusy ? 'Saving...' : 'Save As New Prompt'}
        </Button>
      </div>
    </div>
  );
}

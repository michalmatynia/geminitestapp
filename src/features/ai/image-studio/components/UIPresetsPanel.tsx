'use client';

import React, { useEffect, useMemo, useState } from 'react';

import { useSettingsMap } from '@/shared/hooks/use-settings';
import {
  Label,
  SelectSimple,
} from '@/shared/ui';

import { usePromptState, usePromptActions } from '../context/PromptContext';
import {
  IMAGE_STUDIO_PROMPT_LIBRARY_KEY,
  parseImageStudioPromptLibrary,
  type ImageStudioPromptEntry,
} from '../utils/prompt-library';

const NONE_OPTION_VALUE = '__none__';
const CUSTOM_OPTION_VALUE = '__custom__';

export function UIPresetsPanel(): React.JSX.Element {
  const { promptText } = usePromptState();
  const { setPromptText } = usePromptActions();
  const heavySettings = useSettingsMap({ scope: 'heavy' });
  const [selectedPromptId, setSelectedPromptId] = useState<string>(NONE_OPTION_VALUE);
  const [customPromptSnapshot, setCustomPromptSnapshot] = useState<string | null>(null);

  const heavyMap = heavySettings.data ?? new Map<string, string>();
  const promptLibrary = useMemo<ImageStudioPromptEntry[]>(
    () => parseImageStudioPromptLibrary(heavyMap.get(IMAGE_STUDIO_PROMPT_LIBRARY_KEY)),
    [heavyMap]
  );

  const promptOptions = useMemo(
    () => ([
      { value: NONE_OPTION_VALUE, label: 'Choose prompt' },
      ...(customPromptSnapshot !== null ? [{ value: CUSTOM_OPTION_VALUE, label: 'Custom' }] : []),
      ...promptLibrary.map((entry: ImageStudioPromptEntry) => ({
        value: entry.id,
        label: entry.name,
      })),
    ]),
    [customPromptSnapshot, promptLibrary]
  );

  useEffect(() => {
    if (selectedPromptId === NONE_OPTION_VALUE) return;
    if (selectedPromptId === CUSTOM_OPTION_VALUE) return;
    if (promptLibrary.some((entry: ImageStudioPromptEntry) => entry.id === selectedPromptId)) return;
    setSelectedPromptId(NONE_OPTION_VALUE);
  }, [promptLibrary, selectedPromptId]);

  return (
    <div className='grid grid-cols-1 gap-2 rounded border border-border/60 bg-card/40 p-2'>
      <div className='flex items-center justify-between gap-2'>
        <Label className='text-[11px] text-gray-300'>Prompt</Label>
        <span className='text-[10px] text-gray-500'>
          {promptLibrary.length} saved
        </span>
      </div>
      <SelectSimple
        size='sm'
        value={selectedPromptId}
        onValueChange={(value: string) => {
          if (value === NONE_OPTION_VALUE) {
            setSelectedPromptId(NONE_OPTION_VALUE);
            return;
          }
          if (value === CUSTOM_OPTION_VALUE) {
            if (customPromptSnapshot !== null) {
              setPromptText(customPromptSnapshot);
            }
            setSelectedPromptId(CUSTOM_OPTION_VALUE);
            return;
          }

          const selected = promptLibrary.find((entry: ImageStudioPromptEntry) => entry.id === value);
          if (!selected) {
            setSelectedPromptId(NONE_OPTION_VALUE);
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
    </div>
  );
}

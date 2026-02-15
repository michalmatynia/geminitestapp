'use client';

import { Plus, Trash2 } from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { logClientError } from '@/features/observability';
import { useSettingsMap, useUpdateSetting } from '@/shared/hooks/use-settings';
import { Button, Input, Label, Textarea, useToast } from '@/shared/ui';
import { serializeSetting } from '@/shared/utils/settings-json';

import {
  IMAGE_STUDIO_PROMPT_LIBRARY_KEY,
  parseImageStudioPromptLibrary,
  type ImageStudioPromptEntry,
} from '../utils/prompt-library';

function createPromptId(): string {
  return typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `prompt_${Date.now().toString(36)}`;
}

function createDefaultPromptName(entries: ImageStudioPromptEntry[]): string {
  const existing = new Set(entries.map((entry: ImageStudioPromptEntry) => entry.name.trim().toLowerCase()));
  let index = entries.length + 1;
  while (existing.has(`prompt ${index}`)) {
    index += 1;
  }
  return `Prompt ${index}`;
}

function formatPromptTimestamp(value: string): string {
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return value;
  return new Date(parsed).toLocaleString();
}

export function AdminImageStudioPromptsPage(): React.JSX.Element {
  const { toast } = useToast();
  const heavySettings = useSettingsMap({ scope: 'heavy' });
  const updateSetting = useUpdateSetting();

  const heavyMap = heavySettings.data ?? new Map<string, string>();
  const promptsRaw = heavyMap.get(IMAGE_STUDIO_PROMPT_LIBRARY_KEY);
  const persistedPrompts = useMemo(() => parseImageStudioPromptLibrary(promptsRaw), [promptsRaw]);

  const [promptEntries, setPromptEntries] = useState<ImageStudioPromptEntry[]>([]);
  const [selectedPromptId, setSelectedPromptId] = useState<string>('');
  const hydratedRawRef = useRef<string | null>(null);

  useEffect(() => {
    if (promptEntries.length === 0) {
      if (selectedPromptId) setSelectedPromptId('');
      return;
    }
    if (!selectedPromptId || !promptEntries.some((entry: ImageStudioPromptEntry) => entry.id === selectedPromptId)) {
      setSelectedPromptId(promptEntries[0]!.id);
    }
  }, [promptEntries, selectedPromptId]);

  const activePrompt = useMemo(
    () => promptEntries.find((entry: ImageStudioPromptEntry) => entry.id === selectedPromptId) ?? null,
    [promptEntries, selectedPromptId]
  );
  const isDirty = useMemo(
    () => serializeSetting(promptEntries) !== serializeSetting(persistedPrompts),
    [promptEntries, persistedPrompts]
  );

  useEffect(() => {
    const rawSignature = promptsRaw ?? '';
    if (hydratedRawRef.current === null) {
      setPromptEntries(persistedPrompts);
      hydratedRawRef.current = rawSignature;
      return;
    }
    if (hydratedRawRef.current === rawSignature) return;
    if (isDirty) return;
    setPromptEntries(persistedPrompts);
    hydratedRawRef.current = rawSignature;
  }, [isDirty, persistedPrompts, promptsRaw]);

  const handleAddPrompt = useCallback((): void => {
    const nextPromptId = createPromptId();
    const now = new Date().toISOString();
    setPromptEntries((prev: ImageStudioPromptEntry[]) => {
      const nextPrompt: ImageStudioPromptEntry = {
        id: nextPromptId,
        name: createDefaultPromptName(prev),
        prompt: '',
        createdAt: now,
        updatedAt: now,
      };
      return [nextPrompt, ...prev];
    });
    setSelectedPromptId(nextPromptId);
  }, []);

  const handleUpdateActivePrompt = useCallback(
    (patch: Partial<Pick<ImageStudioPromptEntry, 'name' | 'prompt'>>): void => {
      if (!selectedPromptId) return;
      setPromptEntries((prev: ImageStudioPromptEntry[]) =>
        prev.map((entry: ImageStudioPromptEntry) =>
          entry.id === selectedPromptId
            ? { ...entry, ...patch, updatedAt: new Date().toISOString() }
            : entry
        )
      );
    },
    [selectedPromptId]
  );

  const handleDeletePrompt = useCallback((id: string): void => {
    setPromptEntries((prev: ImageStudioPromptEntry[]) => prev.filter((entry: ImageStudioPromptEntry) => entry.id !== id));
    setSelectedPromptId((current: string) => (current === id ? '' : current));
  }, []);

  const handleSavePrompts = useCallback(async (): Promise<void> => {
    try {
      await updateSetting.mutateAsync({
        key: IMAGE_STUDIO_PROMPT_LIBRARY_KEY,
        value: serializeSetting(promptEntries),
      });
      toast('Prompts saved.', { variant: 'success' });
    } catch (error) {
      logClientError(error, { context: { source: 'AdminImageStudioPromptsPage', action: 'savePrompts' } });
      toast('Failed to save prompts.', { variant: 'error' });
    }
  }, [promptEntries, toast, updateSetting]);

  return (
    <div className='container mx-auto max-w-6xl py-2'>
      <div className='space-y-4 rounded-lg border border-border/60 bg-card/40 p-4'>
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <div>
            <div className='text-lg text-gray-100'>Prompt Library</div>
            <div className='text-xs text-gray-500'>Add, edit, and remove reusable Image Studio prompts.</div>
          </div>
          <div className='flex items-center gap-2'>
            <Button
              size='sm'
              type='button'
              variant='outline'
              onClick={handleAddPrompt}
            >
              <Plus className='mr-1 size-4' />
              Add prompt
            </Button>
            <Button
              size='sm'
              type='button'
              variant='default'
              onClick={() => {
                void handleSavePrompts();
              }}
              disabled={!isDirty || updateSetting.isPending}
            >
              {updateSetting.isPending ? 'Saving...' : 'Save prompts'}
            </Button>
          </div>
        </div>

        <div className='grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]'>
          <div className='space-y-2 rounded border border-border/60 bg-card/30 p-2'>
            <div className='px-1 text-[11px] text-gray-500'>
              {promptEntries.length} prompt{promptEntries.length === 1 ? '' : 's'}
            </div>
            {promptEntries.length === 0 ? (
              <div className='rounded border border-dashed border-border/60 p-5 text-center text-sm text-gray-500'>
                No prompts yet. Add your first prompt.
              </div>
            ) : (
              promptEntries.map((entry: ImageStudioPromptEntry) => {
                const isSelected = entry.id === selectedPromptId;
                return (
                  <div
                    key={entry.id}
                    className={
                      isSelected
                        ? 'flex items-start gap-2 rounded border border-primary/60 bg-primary/5'
                        : 'flex items-start gap-2 rounded border border-border/60 bg-card/40'
                    }
                  >
                    <button
                      type='button'
                      className='min-w-0 flex-1 px-2 py-2 text-left'
                      onClick={() => setSelectedPromptId(entry.id)}
                    >
                      <div className='truncate text-sm text-gray-100'>{entry.name}</div>
                      <div className='mt-0.5 truncate text-[11px] text-gray-500'>
                        {entry.prompt.trim() || 'Empty prompt'}
                      </div>
                    </button>
                    <Button
                      size='xs'
                      type='button'
                      variant='ghost'
                      className='mt-2 mr-1 h-7 w-7 p-0'
                      onClick={() => handleDeletePrompt(entry.id)}
                      title='Delete prompt'
                      aria-label={`Delete prompt ${entry.name}`}
                    >
                      <Trash2 className='size-3.5' />
                    </Button>
                  </div>
                );
              })
            )}
          </div>

          <div className='rounded border border-border/60 bg-card/30 p-4'>
            {activePrompt ? (
              <div className='space-y-4'>
                <div className='space-y-1'>
                  <Label className='text-xs text-gray-400'>Prompt name</Label>
                  <Input
                    size='sm'
                    value={activePrompt.name}
                    onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                      handleUpdateActivePrompt({ name: event.target.value })
                    }
                    placeholder='Prompt name'
                    className='h-9'
                  />
                </div>
                <div className='space-y-1'>
                  <Label className='text-xs text-gray-400'>Prompt text</Label>
                  <Textarea
                    size='sm'
                    value={activePrompt.prompt}
                    onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) =>
                      handleUpdateActivePrompt({ prompt: event.target.value })
                    }
                    placeholder='Write your prompt here...'
                    className='min-h-[280px] font-mono text-[12px]'
                  />
                </div>
                <div className='text-[11px] text-gray-500'>
                  Last updated: {formatPromptTimestamp(activePrompt.updatedAt)}
                </div>
              </div>
            ) : (
              <div className='flex min-h-[260px] items-center justify-center rounded border border-dashed border-border/60 text-sm text-gray-500'>
                Select a prompt to edit.
              </div>
            )}
          </div>
        </div>

        <div className='text-[11px] text-gray-500'>
          {isDirty ? 'Unsaved changes.' : 'All changes saved.'}
        </div>
      </div>
    </div>
  );
}

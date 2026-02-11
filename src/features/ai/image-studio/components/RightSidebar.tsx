'use client';

import { Loader2, Save, Sparkles, Wand2 } from 'lucide-react';
import React, { useMemo, useState } from 'react';

import { logClientError } from '@/features/observability';
import { formatProgrammaticPrompt } from '@/features/prompt-engine/prompt-formatter';
import { flattenParams } from '@/features/prompt-engine/prompt-params';
import { validateProgrammaticPrompt } from '@/features/prompt-engine/prompt-validator';
import {
  parsePromptEngineSettings,
  PROMPT_ENGINE_SETTINGS_KEY,
} from '@/features/prompt-engine/settings';
import { useUpdateSettingsBulk } from '@/shared/hooks/use-settings';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import {
  Button,
  Label,
  MultiSelect,
  SectionPanel,
  Textarea,
  useToast,
} from '@/shared/ui';
import { cn } from '@/shared/utils';

import { GenerationHistoryPanel } from './GenerationHistoryPanel';
import { MaskControlsPanel } from './MaskControlsPanel';
import { OutputImageGrid, type OutputImage } from './OutputImageGrid';
import { ParamRow } from './ParamRow';
import { StudioCard } from './StudioCard';
import { UIPresetsPanel } from './UIPresetsPanel';
import { useGenerationState } from '../context/GenerationContext';
import { useProjectsState } from '../context/ProjectsContext';
import { usePromptActions, usePromptState } from '../context/PromptContext';
import { useSettingsActions } from '../context/SettingsContext';
import { useSlotsActions, useSlotsState } from '../context/SlotsContext';
import {
  IMAGE_STUDIO_ACTIVE_PROJECT_KEY,
  type ImageStudioProjectSession,
  getImageStudioProjectSessionKey,
  serializeImageStudioActiveProject,
  serializeImageStudioProjectSession,
} from '../utils/project-session';

interface RightSidebarProps {
  isFocusMode: boolean;
  maskPreviewEnabled: boolean;
}

export function RightSidebar({
  isFocusMode,
  maskPreviewEnabled,
}: RightSidebarProps): React.JSX.Element {
  const { projectId } = useProjectsState();
  const {
    compositeAssetIds,
    compositeAssetOptions,
    selectedSlotId,
    workingSlotId,
    selectedFolder,
    previewMode,
  } = useSlotsState();
  const { setCompositeAssetIds, createSlots } = useSlotsActions();
  const { promptText, paramsState, paramSpecs, paramUiOverrides } = usePromptState();
  const { setPromptText, setExtractReviewOpen, setExtractDraftPrompt } = usePromptActions();
  const { runOutputs, generationHistory } = useGenerationState();
  const { saveStudioSettings } = useSettingsActions();
  const updateSettingsBulk = useUpdateSettingsBulk();

  const { toast } = useToast();
  const settingsStore = useSettingsStore();
  const [projectSaveBusy, setProjectSaveBusy] = useState(false);

  const promptValidationSettings = useMemo(
    () => parsePromptEngineSettings(settingsStore.get(PROMPT_ENGINE_SETTINGS_KEY)).promptValidation,
    [settingsStore]
  );

  const flattenedParams = useMemo(
    () => (paramsState ? flattenParams(paramsState).filter((leaf) => Boolean(leaf.path)) : []),
    [paramsState]
  );

  const cloneSettingValue = <T,>(value: T): T => {
    try {
      return JSON.parse(JSON.stringify(value)) as T;
    } catch {
      return value;
    }
  };

  const autoFormatPrompt = (): void => {
    if (!promptText.trim()) {
      toast('Enter prompt text first.', { variant: 'info' });
      return;
    }
    try {
      const beforeIssues = validateProgrammaticPrompt(promptText, promptValidationSettings);
      const result = formatProgrammaticPrompt(promptText, promptValidationSettings);
      if (result.changed) {
        setPromptText(result.prompt);
      }
      toast(
        result.changed
          ? `Formatted prompt. Validation issues: ${beforeIssues.length} -> ${result.issuesAfter}.`
          : `No formatter changes applied. Validation issues: ${beforeIssues.length}.`,
        { variant: result.changed ? 'success' : 'info' }
      );
    } catch (error) {
      logClientError(error, {
        context: { source: 'RightSidebar', action: 'autoFormatPrompt', level: 'error' },
      });
      toast(error instanceof Error ? error.message : 'Failed to format prompt.', { variant: 'error' });
    }
  };

  const validatePrompt = (): void => {
    if (!promptText.trim()) {
      toast('Enter prompt text first.', { variant: 'info' });
      return;
    }
    try {
      const issues = validateProgrammaticPrompt(promptText, promptValidationSettings);
      if (issues.length === 0) {
        toast('Prompt validation passed.', { variant: 'success' });
        return;
      }
      toast(`Prompt validation found ${issues.length} issue(s).`, { variant: 'warning' });
    } catch (error) {
      logClientError(error, {
        context: { source: 'RightSidebar', action: 'validatePrompt', level: 'error' },
      });
      toast(error instanceof Error ? error.message : 'Failed to validate prompt.', { variant: 'error' });
    }
  };

  const handleSaveProject = (): void => {
    if (!projectId.trim()) {
      toast('Select a project first.', { variant: 'info' });
      return;
    }
    const projectSessionKey = getImageStudioProjectSessionKey(projectId);
    if (!projectSessionKey) {
      toast('Invalid project id.', { variant: 'error' });
      return;
    }

    const projectSession: ImageStudioProjectSession = {
      version: 1,
      projectId: projectId.trim(),
      savedAt: new Date().toISOString(),
      selectedFolder,
      selectedSlotId,
      workingSlotId,
      compositeAssetIds: cloneSettingValue(compositeAssetIds),
      previewMode,
      promptText,
      paramsState: cloneSettingValue(paramsState),
      paramSpecs: cloneSettingValue((paramSpecs ?? null) as Record<string, unknown> | null),
      paramUiOverrides: cloneSettingValue((paramUiOverrides ?? {}) as Record<string, unknown>),
    };

    if (projectSaveBusy) return;
    setProjectSaveBusy(true);
    void Promise.all([
      saveStudioSettings({ silent: true }),
      updateSettingsBulk.mutateAsync([
        {
          key: IMAGE_STUDIO_ACTIVE_PROJECT_KEY,
          value: serializeImageStudioActiveProject(projectId),
        },
        {
          key: projectSessionKey,
          value: serializeImageStudioProjectSession(projectSession),
        },
      ]),
    ])
      .then(() => {
        toast(`Project "${projectId}" saved.`, { variant: 'success' });
      })
      .catch((error: unknown) => {
        toast(error instanceof Error ? error.message : 'Failed to save project.', { variant: 'error' });
      })
      .finally(() => {
        setProjectSaveBusy(false);
      });
  };

  return (
    <SectionPanel
      className={cn(
        'order-3 flex min-h-0 flex-1 flex-col overflow-hidden p-0 transition-all duration-300 ease-in-out',
        isFocusMode && 'pointer-events-none opacity-0 translate-x-2'
      )}
      variant='subtle'
      aria-hidden={isFocusMode}
    >
      <div className='flex flex-wrap items-center justify-end gap-2 px-4 py-2'>
        <Button
          variant='outline'
          size='sm'
          title='Extract functions and selectors from prompt'
          aria-label='Extract functions and selectors from prompt'
          disabled={!promptText.trim()}
          onClick={() => { setExtractDraftPrompt(promptText); setExtractReviewOpen(true); }}
        >
          <Sparkles className='mr-2 size-4' />
          Extract
        </Button>
        <Button
          variant='outline'
          size='sm'
          title='Validate prompt against prompt-engine patterns'
          aria-label='Validate prompt against prompt-engine patterns'
          disabled={!promptText.trim()}
          onClick={validatePrompt}
        >
          Validate
        </Button>
        <Button
          variant='outline'
          size='sm'
          title='Auto format prompt'
          aria-label='Auto format prompt'
          disabled={!promptText.trim()}
          onClick={autoFormatPrompt}
        >
          <Wand2 className='mr-2 size-4' />
          Format
        </Button>
        <Button
          variant='outline'
          size='sm'
          title='Save current Image Studio project state'
          aria-label='Save current Image Studio project state'
          disabled={projectSaveBusy || !projectId.trim()}
          onClick={handleSaveProject}
        >
          {projectSaveBusy ? <Loader2 className='mr-2 size-4 animate-spin' /> : <Save className='mr-2 size-4' />}
          Save Project
        </Button>
      </div>
      <div className='relative flex min-h-0 flex-1 flex-col gap-3 px-4 pb-4 pt-0'>
        <Textarea
          value={promptText}
          onChange={(event) => setPromptText(event.target.value)}
          className='h-40 font-mono text-[11px]'
          placeholder='Paste prompt here...'
        />

        <UIPresetsPanel />

        <StudioCard label='Composite References'>
          <MultiSelect
            options={compositeAssetOptions}
            selected={compositeAssetIds}
            onChange={setCompositeAssetIds}
            placeholder='Select additional reference cards'
            searchPlaceholder='Search cards...'
            emptyMessage='No cards available.'
            className='w-full'
          />
          <div className='text-[10px] text-gray-500'>
            Selected references are sent with the base image for multi-image generation.
          </div>
        </StudioCard>

        <MaskControlsPanel maskPreviewEnabled={maskPreviewEnabled} />

        {runOutputs.length > 0 ? (
          <div className='space-y-1'>
            <Label className='text-xs text-gray-400'>Outputs ({runOutputs.length})</Label>
            <OutputImageGrid
              outputs={runOutputs}
              onSaveAsSlot={projectId ? (output: OutputImage) => {
                createSlots([
                  {
                    name: output.filename ?? 'Generated',
                    imageFileId: output.id,
                    metadata: workingSlotId
                      ? {
                        role: 'generation',
                        sourceSlotId: workingSlotId,
                        relationType: 'generation:output',
                        generationFileId: output.id,
                      }
                      : {
                        role: 'generation',
                      },
                  },
                ])
                  .then(() => toast('Saved to card history.', { variant: 'success' }))
                  .catch(() => toast('Failed to save card history item.', { variant: 'error' }));
              } : undefined}
            />
          </div>
        ) : null}

        {generationHistory.length > 0 ? (
          <StudioCard label='History' count={generationHistory.length}>
            <GenerationHistoryPanel />
          </StudioCard>
        ) : null}

        <div className='flex-1 overflow-auto'>
          {paramsState ? (
            <div className='space-y-3'>
              {flattenedParams.length > 0 ? (
                flattenedParams.map((leaf) => (
                  <ParamRow key={leaf.path} leaf={leaf} />
                ))
              ) : (
                <div className='text-xs text-gray-500'>
                  No editable params were found in the extracted payload.
                </div>
              )}
            </div>
          ) : (
            <div className='text-sm text-gray-400'>Extract params to edit.</div>
          )}
        </div>
      </div>
    </SectionPanel>
  );
}

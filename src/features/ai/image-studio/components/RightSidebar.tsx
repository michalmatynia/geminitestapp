'use client';

import { Eye, Loader2, Pentagon, Save, SlidersHorizontal, Sparkles } from 'lucide-react';
import React, { useMemo, useState } from 'react';

import { logClientError } from '@/features/observability';
import { formatProgrammaticPrompt } from '@/features/prompt-engine/prompt-formatter';
import { flattenParams } from '@/features/prompt-engine/prompt-params';
import { validateProgrammaticPrompt } from '@/features/prompt-engine/prompt-validator';
import {
  parsePromptEngineSettings,
  PROMPT_ENGINE_SETTINGS_KEY,
} from '@/features/prompt-engine/settings';
import {
  VectorDrawingToolbar,
} from '@/features/vector-drawing';
import { useUpdateSettingsBulk } from '@/shared/hooks/use-settings';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import {
  Button,
  AppModal,
  Label,
  MultiSelect,
  SectionPanel,
  Textarea,
  ValidatorFormatterToggle,
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
import { useMaskingActions, useMaskingState } from '../context/MaskingContext';
import { useProjectsState } from '../context/ProjectsContext';
import { usePromptActions, usePromptState } from '../context/PromptContext';
import { useSettingsState, useSettingsActions } from '../context/SettingsContext';
import { useSlotsActions, useSlotsState } from '../context/SlotsContext';
import { useUiActions, useUiState } from '../context/UiContext';
import {
  IMAGE_STUDIO_ACTIVE_PROJECT_KEY,
  type ImageStudioProjectSession,
  getImageStudioProjectSessionKey,
  serializeImageStudioActiveProject,
  serializeImageStudioProjectSession,
} from '../utils/project-session';
import { buildRunRequestPreview } from '../utils/run-request-preview';

export function RightSidebar(): React.JSX.Element {
  const { isFocusMode, validatorEnabled, formatterEnabled } = useUiState();
  const { setValidatorEnabled, setFormatterEnabled } = useUiActions();
  const { projectId } = useProjectsState();
  const { tool, maskShapes, maskInvert, maskFeather } = useMaskingState();
  const { setTool } = useMaskingActions();
  const {
    workingSlot,
    slots,
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
  const { studioSettings } = useSettingsState();
  const { runOutputs, generationHistory } = useGenerationState();
  const { saveStudioSettings } = useSettingsActions();
  const updateSettingsBulk = useUpdateSettingsBulk();

  const { toast } = useToast();
  const settingsStore = useSettingsStore();
  const [projectSaveBusy, setProjectSaveBusy] = useState(false);
  const [requestPreviewOpen, setRequestPreviewOpen] = useState(false);
  const [promptControlOpen, setPromptControlOpen] = useState(false);
  const [controlsOpen, setControlsOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [activeToolsPanel, setActiveToolsPanel] = useState<'shape-selector'>('shape-selector');

  const promptValidationSettings = useMemo(
    () => parsePromptEngineSettings(settingsStore.get(PROMPT_ENGINE_SETTINGS_KEY)).promptValidation,
    [settingsStore]
  );

  const flattenedParams = useMemo(
    () => (paramsState ? flattenParams(paramsState).filter((leaf) => Boolean(leaf.path)) : []),
    [paramsState]
  );
  const hasExtractedControls = flattenedParams.length > 0;

  const requestPreview = useMemo(
    () =>
      buildRunRequestPreview({
        projectId,
        workingSlot,
        slots,
        compositeAssetIds,
        promptText,
        paramsState,
        maskShapes,
        maskInvert,
        maskFeather,
        studioSettings,
      }),
    [
      projectId,
      workingSlot,
      slots,
      compositeAssetIds,
      promptText,
      paramsState,
      maskShapes,
      maskInvert,
      maskFeather,
      studioSettings,
    ]
  );

  const requestPreviewJson = useMemo(
    () =>
      requestPreview.payload
        ? JSON.stringify(requestPreview.payload, null, 2)
        : JSON.stringify(
          {
            errors: requestPreview.errors,
          },
          null,
          2
        ),
    [requestPreview]
  );

  const cloneSettingValue = <T,>(value: T): T => {
    try {
      return JSON.parse(JSON.stringify(value)) as T;
    } catch {
      return value;
    }
  };

  const preparePromptForExtraction = (): string => {
    const trimmedPrompt = promptText.trim();
    if (!trimmedPrompt) return promptText;
    if (!validatorEnabled) return promptText;

    let nextPrompt = promptText;
    try {
      const beforeIssues = validateProgrammaticPrompt(nextPrompt, promptValidationSettings);
      if (!formatterEnabled) {
        if (beforeIssues.length === 0) {
          toast('Prompt validation passed.', { variant: 'success' });
        } else {
          toast(`Prompt validation found ${beforeIssues.length} issue(s).`, { variant: 'warning' });
        }
        return nextPrompt;
      }

      const result = formatProgrammaticPrompt(nextPrompt, promptValidationSettings);
      if (result.changed) {
        nextPrompt = result.prompt;
        setPromptText(result.prompt);
      }
      toast(
        result.changed
          ? `Formatted prompt. Validation issues: ${beforeIssues.length} -> ${result.issuesAfter}.`
          : `No formatter changes applied. Validation issues: ${beforeIssues.length}.`,
        { variant: result.changed ? 'success' : 'info' }
      );
      return nextPrompt;
    } catch (error) {
      logClientError(error, {
        context: { source: 'RightSidebar', action: 'preparePromptForExtraction', level: 'error' },
      });
      toast(
        error instanceof Error
          ? error.message
          : formatterEnabled
            ? 'Failed to format prompt.'
            : 'Failed to validate prompt.',
        { variant: 'error' }
      );
      return promptText;
    }
  };

  const handleExtractReviewOpen = (): void => {
    if (!promptText.trim()) {
      toast('Enter prompt text first.', { variant: 'info' });
      return;
    }
    const preparedPrompt = preparePromptForExtraction();
    setExtractDraftPrompt(preparedPrompt);
    setExtractReviewOpen(true);
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
    <>
      <SectionPanel
        className={cn(
          'order-3 flex h-full min-h-0 flex-1 flex-col overflow-hidden p-0 transition-all duration-300 ease-in-out',
          isFocusMode && 'pointer-events-none opacity-0 translate-x-2'
        )}
        variant='subtle'
        aria-hidden={isFocusMode}
      >
        <div className='flex flex-wrap items-center justify-end gap-2 px-4 py-2'>
          <Button
            variant='outline'
            size='sm'
            title='Open prompt controls'
            aria-label='Open prompt controls'
            onClick={() => setPromptControlOpen(true)}
          >
            <Sparkles className='mr-2 size-4' />
          Control Prompt
          </Button>
          <Button
            variant='outline'
            size='sm'
            title='Preview generation request payload and input images'
            aria-label='Preview generation request payload and input images'
            onClick={() => setRequestPreviewOpen(true)}
          >
            <Eye className='mr-2 size-4' />
          Preview Request
          </Button>
          <Button
            variant='outline'
            size='sm'
            title={hasExtractedControls ? 'Open extracted controls' : 'Extract controls first'}
            aria-label='Open extracted controls'
            disabled={!hasExtractedControls}
            onClick={() => setControlsOpen(true)}
          >
            <SlidersHorizontal className='mr-2 size-4' />
            Controls
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
          <Button
            variant='outline'
            size='sm'
            title='Open tools toolbar'
            aria-label='Open tools toolbar'
            onClick={() => {
              setActiveToolsPanel('shape-selector');
              setToolsOpen(true);
            }}
          >
            <Pentagon className='mr-2 size-4' />
            Tools
          </Button>
        </div>
        <div className='relative flex min-h-0 flex-1 flex-col gap-3 px-4 pb-4 pt-0'>
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

          <MaskControlsPanel />

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
        </div>
      </SectionPanel>

      <AppModal
        open={promptControlOpen}
        onClose={() => setPromptControlOpen(false)}
        title='Control Prompt'
        size='md'
      >
        <div className='space-y-4 text-sm text-gray-200'>
          <div className='rounded border border-border/60 bg-card/40 p-3 text-xs text-gray-300'>
            Configure prompt validation and formatting, then open extraction review.
          </div>

          <div className='space-y-2'>
            <Label className='text-xs text-gray-400'>Prompt</Label>
            <Textarea
              value={promptText}
              onChange={(event) => setPromptText(event.target.value)}
              className='h-44 font-mono text-[11px]'
              placeholder='Paste prompt here...'
            />
          </div>

          <UIPresetsPanel />

          <div className='rounded border border-border/60 bg-card/30 p-3'>
            <ValidatorFormatterToggle
              validatorLabel='Validate'
              formatterLabel='Format'
              validatorEnabled={validatorEnabled}
              formatterEnabled={formatterEnabled}
              onValidatorChange={setValidatorEnabled}
              onFormatterChange={setFormatterEnabled}
            />
          </div>

          <div className='flex items-center justify-end gap-2'>
            <Button
              variant='outline'
              size='sm'
              onClick={() => setPromptControlOpen(false)}
            >
              Close
            </Button>
            <Button
              variant='outline'
              size='sm'
              title='Extract functions and selectors from prompt'
              aria-label='Extract functions and selectors from prompt'
              disabled={!promptText.trim()}
              onClick={() => {
                setPromptControlOpen(false);
                handleExtractReviewOpen();
              }}
            >
              <Sparkles className='mr-2 size-4' />
              Extract
            </Button>
          </div>
        </div>
      </AppModal>

      <AppModal
        open={controlsOpen}
        onClose={() => setControlsOpen(false)}
        title='Controls'
        size='lg'
      >
        <div className='space-y-4 text-sm text-gray-200'>
          {hasExtractedControls ? (
            <div className='max-h-[70vh] space-y-3 overflow-auto pr-1'>
              {flattenedParams.map((leaf) => (
                <ParamRow key={leaf.path} leaf={leaf} />
              ))}
            </div>
          ) : (
            <div className='text-xs text-gray-500'>
              No extracted controls available yet.
            </div>
          )}
        </div>
      </AppModal>

      <AppModal
        open={toolsOpen}
        onClose={() => setToolsOpen(false)}
        title='Tools'
        size='md'
      >
        <div className='space-y-4 text-sm text-gray-200'>
          <div className='rounded border border-border/60 bg-card/30 p-2'>
            <div className='mb-2 text-xs text-gray-400'>Toolbar</div>
            <div className='flex items-center gap-2'>
              <Button
                type='button'
                variant={activeToolsPanel === 'shape-selector' ? 'secondary' : 'outline'}
                size='icon'
                title='Shape selector'
                aria-label='Shape selector'
                onClick={() => setActiveToolsPanel('shape-selector')}
              >
                <Pentagon className='size-4' />
              </Button>
              <span className='text-xs text-gray-300'>Shape Selector</span>
            </div>
          </div>

          {activeToolsPanel === 'shape-selector' ? (
            <div className='rounded border border-border/60 bg-card/30 p-3'>
              <div className='mb-2 text-xs text-gray-400'>Shape Selection</div>
              <VectorDrawingToolbar
                tool={tool}
                onSelectTool={setTool}
                className='w-full justify-start rounded-xl border-border/60 bg-card/40'
              />
              <div className='mt-2 text-[11px] text-gray-500'>
                Shape tools were moved here from the preview canvas.
              </div>
            </div>
          ) : null}
        </div>
      </AppModal>

      <AppModal
        open={requestPreviewOpen}
        onClose={() => setRequestPreviewOpen(false)}
        title='Generation Request Preview'
        size='xl'
      >
        <div className='space-y-4 text-xs text-gray-200'>
          <div className='rounded border border-border/60 bg-card/40 p-3 text-[11px] text-gray-300'>
            This is the exact payload enqueued to <span className='text-gray-100'>`/api/image-studio/run`</span> before Redis runtime processing.
          </div>
          <div className='text-[11px] text-gray-400'>
            Resolved prompt length: <span className='text-gray-200'>{requestPreview.resolvedPrompt.length}</span> ·
            mask shapes in payload: <span className='text-gray-200'>{requestPreview.maskShapeCount}</span>
          </div>

          {requestPreview.errors.length > 0 ? (
            <div className='rounded border border-red-400/40 bg-red-500/10 p-3 text-[11px] text-red-200'>
              {requestPreview.errors.join(' ')}
            </div>
          ) : null}

          <div className='space-y-2'>
            <div className='text-[11px] text-gray-400'>
              Input Images ({requestPreview.images.length})
            </div>
            {requestPreview.images.length > 0 ? (
              <div className='grid grid-cols-2 gap-2 md:grid-cols-3'>
                {requestPreview.images.map((image) => (
                  <div key={`${image.kind}:${image.id ?? image.filepath}`} className='rounded border border-border/60 bg-card/30 p-2'>
                    <div className='mb-1 text-[10px] uppercase tracking-wide text-gray-500'>
                      {image.kind === 'base' ? 'Base' : 'Reference'}
                    </div>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={image.filepath}
                      alt={image.name}
                      className='h-28 w-full rounded object-cover'
                    />
                    <div className='mt-1 truncate text-[11px] text-gray-200'>{image.name}</div>
                    <div className='truncate text-[10px] text-gray-500'>{image.filepath}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className='text-[11px] text-gray-500'>No request images are available yet.</div>
            )}
          </div>

          <div className='space-y-2'>
            <div className='text-[11px] text-gray-400'>Payload JSON</div>
            <pre className='max-h-[50vh] overflow-auto rounded border border-border/60 bg-black/30 p-3 font-mono text-[11px] text-gray-100 whitespace-pre-wrap'>
              {requestPreviewJson}
            </pre>
          </div>
        </div>
      </AppModal>
    </>
  );
}

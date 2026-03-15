'use client';

import { Play, Sparkles, Workflow } from 'lucide-react';
import { useRouter } from 'next/navigation';
import React, { useState, useCallback } from 'react';

import {
  serializeImageStudioProjectSession,
  getImageStudioProjectSessionKey,
  saveImageStudioProjectSessionLocal,
  type ImageStudioProjectSession,
} from '@/features/ai/image-studio/utils/project-session';
import { useUpdateSetting } from '@/shared/hooks/use-settings';
import { validateProgrammaticPrompt } from '@/shared/lib/prompt-engine';
import { formatProgrammaticPrompt } from '@/shared/lib/prompt-engine';
import {
  parsePromptEngineSettings,
  PROMPT_ENGINE_SETTINGS_KEY,
} from '@/shared/lib/prompt-engine/settings';
import { savePromptExploderDraftPrompt } from '@/shared/lib/prompt-exploder/bridge';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import { ValidatorFormatterToggle, useToast } from '@/shared/ui';
import { DetailModal } from '@/shared/ui/templates/modals/DetailModal';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

import { cloneSerializableValue } from './right-sidebar-utils';
import {
  RightSidebarPromptControlHeader,
  RightSidebarPromptControlHeaderRuntimeContext,
  type RightSidebarPromptControlHeaderRuntimeValue,
} from './RightSidebarPromptControlHeader';
import { useProjectsState } from '../../context/ProjectsContext';
import { usePromptState, usePromptActions } from '../../context/PromptContext';
import { useSlotsState } from '../../context/SlotsContext';
import { useUiState, useUiActions } from '../../context/UiContext';
import {
  StudioActionButtonRow,
  type StudioActionButtonConfig,
} from '../modals/StudioActionButtonRow';
import { StudioPromptTextSection } from '../modals/StudioPromptTextSection';
import { useRightSidebarContext } from '../RightSidebarContext';
import { UIPresetsPanel } from '../UIPresetsPanel';

export function ControlPromptModal(): React.JSX.Element {
  const router = useRouter();
  const { toast } = useToast();
  const { projectId } = useProjectsState();
  const { promptText, paramsState, paramSpecs, paramUiOverrides } = usePromptState();
  const { setPromptText, setExtractReviewOpen, setExtractDraftPrompt } = usePromptActions();
  const { validatorEnabled, formatterEnabled } = useUiState();
  const { setValidatorEnabled, setFormatterEnabled } = useUiActions();
  const {
    promptControlOpen,
    closePromptControl,
    generationBusy,
    sequenceRunBusy,
    modelSupportsSequenceGeneration,
    onRunGeneration,
    onRunSequenceGeneration,
  } = useRightSidebarContext();
  const { selectedFolder, selectedSlotId, workingSlotId, compositeAssetIds, previewMode } =
    useSlotsState();
  const updateSetting = useUpdateSetting();
  const settingsStore = useSettingsStore();
  const [promptSaveBusy, setPromptSaveBusy] = useState(false);

  const promptValidationSettings = React.useMemo(
    () => parsePromptEngineSettings(settingsStore.get(PROMPT_ENGINE_SETTINGS_KEY)).promptValidation,
    [settingsStore]
  );

  const handleSavePromptToProject = useCallback((): void => {
    const normalizedProjectId = projectId.trim();
    if (!normalizedProjectId) {
      toast('Select a project first.', { variant: 'info' });
      return;
    }
    const projectSessionKey = getImageStudioProjectSessionKey(normalizedProjectId);
    if (!projectSessionKey) {
      toast('Invalid project id.', { variant: 'error' });
      return;
    }
    if (promptSaveBusy) return;

    const projectSession: ImageStudioProjectSession = {
      version: 1,
      projectId: normalizedProjectId,
      savedAt: new Date().toISOString(),
      selectedFolder,
      selectedSlotId,
      workingSlotId,
      compositeAssetIds: cloneSerializableValue(compositeAssetIds),
      previewMode,
      promptText,
      paramsState: cloneSerializableValue(paramsState),
      paramSpecs: cloneSerializableValue((paramSpecs ?? null) as Record<string, unknown> | null),
      paramUiOverrides: cloneSerializableValue((paramUiOverrides ?? {}) as Record<string, unknown>),
    };

    setPromptSaveBusy(true);
    void (async (): Promise<void> => {
      let serializedSession: string;
      try {
        serializedSession = serializeImageStudioProjectSession(projectSession);
      } catch (error: unknown) {
        logClientError(error);
        throw new Error(
          error instanceof Error
            ? `Failed to serialize prompt session: ${error.message}`
            : 'Failed to serialize prompt session.',
          { cause: error }
        );
      }
      try {
        saveImageStudioProjectSessionLocal(normalizedProjectId, projectSession);
      } catch (error) {
        logClientError(error);
      
        // Local cache is best-effort.
      }

      await updateSetting.mutateAsync({
        key: projectSessionKey,
        value: serializedSession,
      });

      toast(`Prompt saved to project "${normalizedProjectId}".`, { variant: 'success' });
    })()
      .catch((error: unknown) => {
        let localFallbackSaved: boolean;
        try {
          saveImageStudioProjectSessionLocal(normalizedProjectId, projectSession);
          localFallbackSaved = true;
        } catch (error) {
          logClientError(error);
          localFallbackSaved = false;
        }
        if (localFallbackSaved) {
          toast(
            error instanceof Error
              ? `Cloud save failed. Prompt saved locally: ${error.message}`
              : 'Cloud save failed. Prompt saved locally.',
            { variant: 'warning' }
          );
          return;
        }
        toast(
          error instanceof Error
            ? `Failed to save prompt: ${error.message}`
            : 'Failed to save prompt.',
          { variant: 'error' }
        );
      })
      .finally(() => {
        setPromptSaveBusy(false);
      });
  }, [
    projectId,
    promptSaveBusy,
    selectedFolder,
    selectedSlotId,
    workingSlotId,
    compositeAssetIds,
    previewMode,
    promptText,
    paramsState,
    paramSpecs,
    paramUiOverrides,
    updateSetting,
    toast,
  ]);

  const preparePromptForExtraction = (): string => {
    const trimmedPrompt = promptText.trim();
    if (!trimmedPrompt) return promptText;
    if (!validatorEnabled) return promptText;

    let nextPrompt = promptText;
    try {
      const beforeIssues = validateProgrammaticPrompt(nextPrompt, promptValidationSettings, {
        scope: 'image_studio_prompt',
      });
      if (!formatterEnabled) {
        if (beforeIssues.length === 0) {
          toast('Prompt validation passed.', { variant: 'success' });
        } else {
          toast(`Prompt validation found ${beforeIssues.length} issue(s).`, { variant: 'warning' });
        }
        return nextPrompt;
      }

      const result = formatProgrammaticPrompt(
        nextPrompt,
        promptValidationSettings,
        { scope: 'image_studio_prompt' },
        { precomputedIssuesBefore: beforeIssues }
      );
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
      logClientError(error);
      logClientError(error, {
        context: {
          source: 'ControlPromptModal',
          action: 'preparePromptForExtraction',
          level: 'error',
        },
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

  const handleOpenPromptExploder = (): void => {
    if (!promptText.trim()) {
      toast('Enter prompt text first.', { variant: 'info' });
      return;
    }
    savePromptExploderDraftPrompt(promptText);
    router.push('/admin/prompt-exploder?source=image-studio&returnTo=%2Fadmin%2Fimage-studio');
  };

  const handlePromptExploderClick = React.useCallback((): void => {
    closePromptControl();
    handleOpenPromptExploder();
  }, [closePromptControl, handleOpenPromptExploder]);

  const promptControlHeaderRuntimeValue =
    React.useMemo<RightSidebarPromptControlHeaderRuntimeValue>(
      () => ({
        onClose: closePromptControl,
        onOpenPromptExploder: handlePromptExploderClick,
        onSave: handleSavePromptToProject,
        projectId,
        promptSaveBusy,
        promptText,
      }),
      [
        closePromptControl,
        handlePromptExploderClick,
        handleSavePromptToProject,
        projectId,
        promptSaveBusy,
        promptText,
      ]
    );

  const promptControlHeader = (
    <RightSidebarPromptControlHeaderRuntimeContext.Provider value={promptControlHeaderRuntimeValue}>
      <RightSidebarPromptControlHeader />
    </RightSidebarPromptControlHeaderRuntimeContext.Provider>
  );

  const promptActions = React.useMemo<StudioActionButtonConfig[]>(() => {
    const actions: StudioActionButtonConfig[] = [];
    if (modelSupportsSequenceGeneration) {
      actions.push({
        key: 'generate-sequence',
        label: 'Generate Sequence',
        loadingText: 'Starting Sequence...',
        size: 'xs',
        onClick: onRunSequenceGeneration,
        disabled: generationBusy || sequenceRunBusy,
        loading: sequenceRunBusy,
        icon: <Workflow className='size-4' />,
      });
    }
    actions.push(
      {
        key: 'generate-prompt',
        label: 'Generate From Prompt',
        size: 'xs',
        variant: 'default',
        onClick: onRunGeneration,
        disabled: !promptText.trim() || generationBusy || sequenceRunBusy,
        loading: generationBusy,
        icon: <Play className='size-4' />,
      },
      {
        key: 'extract-prompt',
        label: 'Extract',
        size: 'xs',
        title: 'Extract functions and selectors from prompt',
        ariaLabel: 'Extract functions and selectors from prompt',
        disabled: !promptText.trim(),
        onClick: () => {
          closePromptControl();
          handleExtractReviewOpen();
        },
        icon: <Sparkles className='size-4' />,
      }
    );
    return actions;
  }, [
    generationBusy,
    handleExtractReviewOpen,
    modelSupportsSequenceGeneration,
    closePromptControl,
    onRunGeneration,
    onRunSequenceGeneration,
    promptText,
    sequenceRunBusy,
  ]);

  return (
    <DetailModal
      isOpen={promptControlOpen}
      onClose={closePromptControl}
      title='Control Prompt'
      size='md'
      header={promptControlHeader}
      className='md:min-w-[63rem] max-w-[66rem] [&>div:first-child]:border-b-0'
    >
      <div className='space-y-4 text-sm text-gray-200'>
        <StudioPromptTextSection
          label='Prompt'
          value={promptText}
          onValueChange={setPromptText}
          textareaSize='sm'
          textareaClassName='h-44'
          placeholder='Paste prompt here...'
        />

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

        <StudioActionButtonRow actions={promptActions} />
      </div>
    </DetailModal>
  );
}

import { useCallback, useMemo } from 'react';

import type { VectorShape } from '@/shared/lib/vector-drawing';
import type {
  ImageStudioSlotRecord,
  ImageStudioSequenceRunStartResponse,
} from '@/shared/contracts/image-studio';
import { api } from '@/shared/lib/api-client';

import {
  buildReferencePreviewImages,
  collectSequenceMaskPolygons,
  resolveSequenceStepsForRun,
  type SequenceRequestPreview,
} from './right-sidebar-utils';
import { resolvePromptPlaceholders } from '@/features/ai/image-studio/utils/run-request-preview';

import type { ImageStudioSequenceStep } from '@/features/ai/image-studio/utils/studio-settings';

type Toast = (
  message: string,
  options?: { variant?: 'success' | 'error' | 'warning' | 'info' }
) => void;

type UseRightSidebarSequenceArgs = {
  compositeAssetIds: string[];
  enabledSequenceRuntimeSteps: ImageStudioSequenceStep[];
  maskFeather: number;
  maskInvert: boolean;
  maskShapes: VectorShape[];
  modelSupportsSequenceGeneration: boolean;
  paramsState: Record<string, unknown> | null;
  projectId: string;
  promptText: string;
  sequenceRequiresPrompt: boolean;
  sequenceRunBusy: boolean;
  setPromptControlOpen: (open: boolean) => void;
  setSequenceRunBusy: (value: boolean) => void;
  setSidebarTab: (tab: 'controls' | 'graph' | 'sequencing' | 'history') => void;
  slots: ImageStudioSlotRecord[];
  studioSettings: Record<string, unknown> & {
    projectSequencing: { enabled: boolean };
  };
  toast: Toast;
  workingSlot: ImageStudioSlotRecord | null;
  workingSlotImageWidth: number | null;
  workingSlotImageHeight: number | null;
  imageContentFrame: { x: number; y: number; width: number; height: number } | null;
};

type UseRightSidebarSequenceResult = {
  handleRunSequenceGeneration: () => void;
  sequenceRequestPreview: SequenceRequestPreview;
  sequenceRequestPreviewJson: string;
};

export function useRightSidebarSequence({
  compositeAssetIds,
  enabledSequenceRuntimeSteps,
  maskFeather,
  maskInvert,
  maskShapes,
  modelSupportsSequenceGeneration,
  paramsState,
  projectId,
  promptText,
  sequenceRequiresPrompt,
  sequenceRunBusy,
  setPromptControlOpen,
  setSequenceRunBusy,
  setSidebarTab,
  slots,
  studioSettings,
  toast,
  workingSlot,
  workingSlotImageWidth,
  workingSlotImageHeight,
  imageContentFrame,
}: UseRightSidebarSequenceArgs): UseRightSidebarSequenceResult {
  const sequenceRequestPreview = useMemo((): SequenceRequestPreview => {
    const errors: string[] = [];
    const normalizedProjectId = projectId.trim();
    if (!normalizedProjectId) {
      errors.push('Select a project first.');
    }
    if (!modelSupportsSequenceGeneration) {
      errors.push('Selected model does not support sequence generation.');
    }
    if (!workingSlot) {
      errors.push('Select a source card before running a sequence.');
    }
    if (!studioSettings.projectSequencing.enabled) {
      errors.push('Enable sequencing first.');
    }
    if (enabledSequenceRuntimeSteps.length === 0) {
      errors.push('Select at least one enabled sequence step.');
    }

    const resolvedPrompt = resolvePromptPlaceholders(promptText, paramsState).trim();
    if (sequenceRequiresPrompt && !resolvedPrompt) {
      errors.push('Enter a prompt before running generation steps.');
    }
    const promptForSequence = (resolvedPrompt || promptText.trim()).trim();
    if (!promptForSequence) {
      errors.push('Sequence prompt is empty.');
    }

    const sourceSlotId = workingSlot?.id ?? '';
    if (!sourceSlotId.trim()) {
      errors.push('Source card id is missing.');
    }

    const sequencePolygons = collectSequenceMaskPolygons(
      maskShapes,
      workingSlotImageWidth ?? 1,
      workingSlotImageHeight ?? 1,
      imageContentFrame
    );
    const { resolvedSteps, errors: stepResolutionErrors } = resolveSequenceStepsForRun(
      enabledSequenceRuntimeSteps,
      {
        maskShapes,
        sourceWidth: workingSlotImageWidth ?? 1,
        sourceHeight: workingSlotImageHeight ?? 1,
        imageContentFrame,
      }
    );
    if (stepResolutionErrors.length > 0) {
      errors.push(...stepResolutionErrors);
    }
    const mask =
      sequencePolygons.length > 0
        ? {
          polygons: sequencePolygons,
          invert: maskInvert,
          feather: maskFeather,
        }
        : null;

    const images = buildReferencePreviewImages(slots, compositeAssetIds);
    const sourceImagePath = workingSlot?.imageFile?.url || workingSlot?.imageUrl || '';
    if (sourceImagePath) {
      images.unshift({
        kind: 'base',
        id: workingSlot?.id,
        name: workingSlot?.name || workingSlot?.id || 'Source card',
        filepath: sourceImagePath,
      });
    }

    if (errors.length > 0) {
      return {
        payload: null,
        errors,
        resolvedPrompt: promptForSequence,
        maskShapeCount: sequencePolygons.length,
        images,
        stepCount: resolvedSteps.length,
      };
    }

    return {
      payload: {
        projectId: normalizedProjectId,
        sourceSlotId,
        prompt: promptForSequence,
        paramsState,
        referenceSlotIds: compositeAssetIds,
        mask,
        studioSettings: studioSettings as unknown as Record<string, unknown>,
        steps: resolvedSteps,
        metadata: {
          source: 'right-sidebar-sequence-generate',
        },
      },
      errors,
      resolvedPrompt: promptForSequence,
      maskShapeCount: sequencePolygons.length,
      images,
      stepCount: resolvedSteps.length,
    };
  }, [
    compositeAssetIds,
    enabledSequenceRuntimeSteps,
    maskFeather,
    maskInvert,
    maskShapes,
    modelSupportsSequenceGeneration,
    paramsState,
    projectId,
    promptText,
    sequenceRequiresPrompt,
    slots,
    studioSettings,
    workingSlot,
    workingSlotImageHeight,
    workingSlotImageWidth,
    imageContentFrame,
  ]);

  const sequenceRequestPreviewJson = useMemo(
    () =>
      sequenceRequestPreview.payload
        ? JSON.stringify(sequenceRequestPreview.payload, null, 2)
        : JSON.stringify(
          {
            errors: sequenceRequestPreview.errors,
          },
          null,
          2
        ),
    [sequenceRequestPreview]
  );

  const handleRunSequenceGeneration = useCallback((): void => {
    if (sequenceRunBusy) return;

    if (!modelSupportsSequenceGeneration) {
      toast('Selected model does not support sequence generation.', { variant: 'info' });
      return;
    }

    const normalizedProjectId = projectId.trim();
    if (!normalizedProjectId) {
      toast('Select a project before running a sequence.', { variant: 'info' });
      return;
    }
    if (!workingSlot) {
      toast('Select a source card before running a sequence.', { variant: 'info' });
      return;
    }
    if (!studioSettings.projectSequencing.enabled) {
      toast('Enable sequencing first.', { variant: 'info' });
      setSidebarTab('sequencing');
      return;
    }
    if (enabledSequenceRuntimeSteps.length === 0) {
      toast('Select at least one enabled sequence step.', { variant: 'info' });
      setSidebarTab('sequencing');
      return;
    }

    const resolvedPrompt = resolvePromptPlaceholders(promptText, paramsState).trim();
    if (sequenceRequiresPrompt && !resolvedPrompt) {
      toast('Enter a prompt before running generation steps.', { variant: 'info' });
      return;
    }

    const polygons = collectSequenceMaskPolygons(
      maskShapes,
      workingSlotImageWidth ?? 1,
      workingSlotImageHeight ?? 1,
      imageContentFrame
    );
    const { resolvedSteps, errors: stepResolutionErrors } = resolveSequenceStepsForRun(
      enabledSequenceRuntimeSteps,
      {
        maskShapes,
        sourceWidth: workingSlotImageWidth ?? 1,
        sourceHeight: workingSlotImageHeight ?? 1,
        imageContentFrame,
      }
    );
    if (stepResolutionErrors.length > 0) {
      toast(stepResolutionErrors[0] ?? 'Selected-shape crop step is not fully configured.', {
        variant: 'info',
      });
      setSidebarTab('sequencing');
      return;
    }
    setSequenceRunBusy(true);
    void api
      .post<ImageStudioSequenceRunStartResponse>('/api/image-studio/sequences/run', {
        projectId: normalizedProjectId,
        sourceSlotId: workingSlot.id,
        prompt: resolvedPrompt || promptText.trim(),
        paramsState,
        referenceSlotIds: compositeAssetIds,
        mask:
          polygons.length > 0
            ? {
              polygons,
              invert: maskInvert,
              feather: maskFeather,
            }
            : null,
        studioSettings: studioSettings as unknown as Record<string, unknown>,
        steps: resolvedSteps,
        metadata: {
          source: 'right-sidebar-sequence-generate',
        },
      })
      .then((result) => {
        const stepCount =
          typeof result.stepCount === 'number' && Number.isFinite(result.stepCount)
            ? Math.max(1, Math.floor(result.stepCount))
            : Math.max(1, enabledSequenceRuntimeSteps.length);
        toast(`Sequence started (${stepCount} step${stepCount === 1 ? '' : 's'}).`, {
          variant: 'success',
        });
        if (result.dispatchMode === 'inline') {
          toast('Redis queue unavailable, sequence is running inline.', { variant: 'info' });
        }
        setPromptControlOpen(false);
        setSidebarTab('sequencing');
      })
      .catch((error: unknown) => {
        toast(error instanceof Error ? error.message : 'Failed to start sequence.', {
          variant: 'error',
        });
      })
      .finally(() => {
        setSequenceRunBusy(false);
      });
  }, [
    sequenceRunBusy,
    modelSupportsSequenceGeneration,
    projectId,
    workingSlot,
    workingSlotImageHeight,
    workingSlotImageWidth,
    imageContentFrame,
    studioSettings,
    enabledSequenceRuntimeSteps,
    promptText,
    paramsState,
    sequenceRequiresPrompt,
    maskShapes,
    compositeAssetIds,
    maskInvert,
    maskFeather,
    setPromptControlOpen,
    setSequenceRunBusy,
    setSidebarTab,
    toast,
  ]);

  return {
    handleRunSequenceGeneration,
    sequenceRequestPreview,
    sequenceRequestPreviewJson,
  };
}

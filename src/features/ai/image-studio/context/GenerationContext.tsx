'use client';

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

import {
  useRunStudio,
  type RunStudioPayload,
  type RunStudioResult,
} from '@/features/ai/image-studio/hooks/useImageStudioMutations';
import type { ImageFileRecord } from '@/shared/types/domain/files';
import { useToast } from '@/shared/ui';

import { useMaskingState, useMaskingActions } from './MaskingContext';
import { useProjectsState } from './ProjectsContext';
import { usePromptState, usePromptActions } from './PromptContext';
import { useSettingsState } from './SettingsContext';
import { useSlotsState } from './SlotsContext';

import type { ImageStudioSlotRecord } from '../types';
import type { UseMutationResult } from '@tanstack/react-query';

// ── Types ────────────────────────────────────────────────────────────────────

export interface GenerationRecord {
  id: string;
  timestamp: string;
  prompt: string;
  maskShapeCount: number;
  maskInvert: boolean;
  maskFeather: number;
  outputs: ImageFileRecord[];
  slotId: string;
  slotName: string;
}

export interface GenerationState {
  runMutation: UseMutationResult<RunStudioResult, Error, RunStudioPayload>;
  runOutputs: ImageFileRecord[];
  maskEligibleCount: number;
  generationHistory: GenerationRecord[];
}

export interface GenerationActions {
  handleRunGeneration: () => void;
  restoreGeneration: (record: GenerationRecord) => void;
}

// ── Contexts ─────────────────────────────────────────────────────────────────

const GenerationStateContext = createContext<GenerationState | null>(null);
const GenerationActionsContext = createContext<GenerationActions | null>(null);

// ── Provider ─────────────────────────────────────────────────────────────────

export function GenerationProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const { toast } = useToast();

  // Cross-domain reads
  const { projectId } = useProjectsState();
  const { workingSlot, slots, compositeAssetIds } = useSlotsState();
  const { maskShapes, maskInvert, maskFeather } = useMaskingState();
  const { setMaskInvert, setMaskFeather } = useMaskingActions();
  const { promptText } = usePromptState();
  const { setPromptText } = usePromptActions();
  const { studioSettings } = useSettingsState();

  const runMutation = useRunStudio();
  const [runOutputs, setRunOutputs] = useState<ImageFileRecord[]>([]);
  const [generationHistory, setGenerationHistory] = useState<GenerationRecord[]>([]);

  const maskEligibleCount = useMemo(
    () => maskShapes.filter((s) => s.visible && s.closed && (s.type === 'polygon' || s.type === 'lasso') && s.points.length >= 3).length,
    [maskShapes]
  );

  const handleRunGeneration = useCallback(() => {
    if (!projectId || !workingSlot) {
      toast('Select a project and choose a card image to generate.', { variant: 'info' });
      return;
    }
    const filepath = workingSlot.imageFile?.filepath;
    if (!filepath) {
      toast('Working card has no image file.', { variant: 'info' });
      return;
    }
    if (!promptText.trim()) {
      toast('Enter a prompt before generating.', { variant: 'info' });
      return;
    }

    const eligibleShapes = maskShapes.filter(
      (s) => s.visible && s.closed && (s.type === 'polygon' || s.type === 'lasso') && s.points.length >= 3
    );
    const mask: RunStudioPayload['mask'] =
      eligibleShapes.length > 0
        ? {
          type: 'polygons' as const,
          polygons: eligibleShapes.map((s) => s.points.map((p) => ({ x: p.x, y: p.y }))),
          invert: maskInvert || undefined,
          feather: maskFeather > 0 ? maskFeather : undefined,
        }
        : null;

    const referenceAssets = compositeAssetIds
      .map((id: string) => slots.find((slot) => slot.id === id))
      .filter((slot): slot is ImageStudioSlotRecord => Boolean(slot))
      .map((slot: ImageStudioSlotRecord) => ({
        id: slot.id,
        filepath: slot.imageFile?.filepath || slot.imageUrl || '',
      }))
      .filter((asset) => Boolean(asset.filepath));

    runMutation.mutate(
      {
        projectId,
        asset: { filepath },
        ...(referenceAssets.length > 0 ? { referenceAssets } : {}),
        prompt: promptText,
        mask,
        studioSettings: studioSettings as unknown as Record<string, unknown>,
      },
      {
        onSuccess: (data) => {
          setRunOutputs(data.outputs);
          const record: GenerationRecord = {
            id: `gen_${Date.now().toString(36)}`,
            timestamp: new Date().toISOString(),
            prompt: promptText,
            maskShapeCount: maskEligibleCount,
            maskInvert,
            maskFeather,
            outputs: data.outputs,
            slotId: workingSlot?.id ?? '',
            slotName: workingSlot?.name ?? workingSlot?.id ?? '',
          };
          setGenerationHistory((prev) => [record, ...prev].slice(0, 50));
          toast(`Generated ${data.outputs.length} image(s).`, { variant: 'success' });
        },
        onError: (error) => {
          toast(error.message || 'Generation failed.', { variant: 'error' });
        },
      }
    );
  }, [
    projectId,
    workingSlot,
    promptText,
    maskShapes,
    maskInvert,
    maskFeather,
    maskEligibleCount,
    studioSettings,
    runMutation,
    toast,
    compositeAssetIds,
    slots,
  ]);

  const restoreGeneration = useCallback(
    (record: GenerationRecord) => {
      setPromptText(record.prompt);
      setMaskInvert(record.maskInvert);
      setMaskFeather(record.maskFeather);
      setRunOutputs(record.outputs);
      toast('Restored generation settings.', { variant: 'info' });
    },
    [setPromptText, setMaskInvert, setMaskFeather, toast]
  );

  const state = useMemo<GenerationState>(
    () => ({ runMutation, runOutputs, maskEligibleCount, generationHistory }),
    [runMutation, runOutputs, maskEligibleCount, generationHistory]
  );

  const actions = useMemo<GenerationActions>(
    () => ({ handleRunGeneration, restoreGeneration }),
    [handleRunGeneration, restoreGeneration]
  );

  return (
    <GenerationActionsContext.Provider value={actions}>
      <GenerationStateContext.Provider value={state}>
        {children}
      </GenerationStateContext.Provider>
    </GenerationActionsContext.Provider>
  );
}

// ── Hooks ────────────────────────────────────────────────────────────────────

export function useGenerationState(): GenerationState {
  const ctx = useContext(GenerationStateContext);
  if (!ctx) throw new Error('useGenerationState must be used within a GenerationProvider');
  return ctx;
}

export function useGenerationActions(): GenerationActions {
  const ctx = useContext(GenerationActionsContext);
  if (!ctx) throw new Error('useGenerationActions must be used within a GenerationProvider');
  return ctx;
}

export function useGeneration(): GenerationState & GenerationActions {
  return { ...useGenerationState(), ...useGenerationActions() };
}

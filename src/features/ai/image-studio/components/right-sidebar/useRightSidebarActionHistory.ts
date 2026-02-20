import { useCallback, useEffect, useRef, useState } from 'react';

import { type ParamSpec } from '@/features/prompt-engine/prompt-params';
import type { VectorShape, VectorToolMode } from '@/features/vector-drawing';

import { areStringArraysEqual, cloneSerializableValue, type StudioActionHistoryEntry, type StudioActionHistorySnapshot } from './right-sidebar-utils';

import type { ParamUiControl } from '../../utils/param-ui';

type BuildActionHistorySnapshotInput = {
  activeMaskId: string | null;
  brushRadius: number;
  canvasBackgroundColor: string;
  canvasBackgroundLayerEnabled: boolean;
  canvasImageOffset: { x: number; y: number };
  canvasSelectionEnabled: boolean;
  compositeAssetIds: string[];
  formatterEnabled: boolean;
  imageTransformMode: 'none' | 'move';
  maskFeather: number;
  maskInvert: boolean;
  maskShapes: VectorShape[];
  paramSpecs: Record<string, ParamSpec> | null;
  paramUiOverrides: Record<string, ParamUiControl>;
  paramsState: Record<string, unknown> | null;
  previewMode: 'image' | '3d';
  promptText: string;
  selectedFolder: string;
  selectedPointIndex: number | null;
  selectedSlotId: string | null;
  studioSettings: Record<string, unknown>;
  tool: VectorToolMode;
  validatorEnabled: boolean;
  workingSlotId: string | null;
};

type UseRightSidebarActionHistoryArgs = {
  actionHistoryMaxSteps: number;
  applySnapshot: (snapshot: StudioActionHistorySnapshot) => void;
  projectId: string;
  snapshotInput: BuildActionHistorySnapshotInput;
};

type UseRightSidebarActionHistoryResult = {
  actionHistoryEntries: StudioActionHistoryEntry[];
  actionHistoryItems: Array<{ entry: StudioActionHistoryEntry; index: number }>;
  activeActionHistoryIndex: number;
  canRedoAction: boolean;
  canUndoAction: boolean;
  handleRedoAction: () => void;
  handleRestoreActionStep: (targetIndex: number) => void;
  handleUndoAction: () => void;
};

const buildActionHistorySnapshot = (
  input: BuildActionHistorySnapshotInput
): StudioActionHistorySnapshot => ({
  selectedFolder: input.selectedFolder,
  selectedSlotId: input.selectedSlotId,
  workingSlotId: input.workingSlotId,
  previewMode: input.previewMode,
  compositeAssetIds: cloneSerializableValue(input.compositeAssetIds),
  tool: input.tool,
  canvasSelectionEnabled: input.canvasSelectionEnabled,
  imageTransformMode: input.imageTransformMode,
  canvasImageOffset: cloneSerializableValue(input.canvasImageOffset),
  canvasBackgroundLayerEnabled: input.canvasBackgroundLayerEnabled,
  canvasBackgroundColor: input.canvasBackgroundColor,
  maskShapes: cloneSerializableValue(input.maskShapes),
  activeMaskId: typeof input.activeMaskId === 'string' ? String(input.activeMaskId) : null,
  selectedPointIndex: Number.isFinite(input.selectedPointIndex) ? Number(input.selectedPointIndex) : null,
  maskInvert: input.maskInvert,
  maskFeather: input.maskFeather,
  brushRadius: input.brushRadius,
  promptText: input.promptText,
  paramsState: cloneSerializableValue(input.paramsState),
  paramSpecs: cloneSerializableValue((input.paramSpecs ?? null) as Record<string, unknown> | null),
  paramUiOverrides: cloneSerializableValue((input.paramUiOverrides ?? {}) as Record<string, unknown>),
  validatorEnabled: input.validatorEnabled,
  formatterEnabled: input.formatterEnabled,
  studioSettings: cloneSerializableValue(input.studioSettings),
});

const resolveActionHistoryLabel = (
  previous: StudioActionHistorySnapshot | null,
  next: StudioActionHistorySnapshot
): string => {
  if (!previous) return 'Initial editor state';
  if (previous.promptText !== next.promptText) return 'Control prompt updated';
  if (previous.tool !== next.tool) return 'Drawing tool changed';
  if (previous.canvasSelectionEnabled !== next.canvasSelectionEnabled) return 'Select tool toggled';
  if (previous.imageTransformMode !== next.imageTransformMode) return 'Image transform tool changed';
  if (
    previous.canvasImageOffset.x !== next.canvasImageOffset.x ||
    previous.canvasImageOffset.y !== next.canvasImageOffset.y
  ) {
    return 'Canvas image position adjusted';
  }
  if (
    previous.canvasBackgroundLayerEnabled !== next.canvasBackgroundLayerEnabled ||
    previous.canvasBackgroundColor !== next.canvasBackgroundColor
  ) {
    return 'Canvas background changed';
  }
  if (previous.maskShapes.length !== next.maskShapes.length) {
    return next.maskShapes.length > previous.maskShapes.length ? 'Shape added' : 'Shape removed';
  }
  if (JSON.stringify(previous.maskShapes) !== JSON.stringify(next.maskShapes)) return 'Shape edited';
  if (previous.activeMaskId !== next.activeMaskId || previous.selectedPointIndex !== next.selectedPointIndex) {
    return 'Shape selection changed';
  }
  if (
    previous.maskInvert !== next.maskInvert ||
    previous.maskFeather !== next.maskFeather ||
    previous.brushRadius !== next.brushRadius
  ) {
    return 'Mask settings changed';
  }
  if (
    previous.selectedFolder !== next.selectedFolder ||
    previous.selectedSlotId !== next.selectedSlotId ||
    previous.workingSlotId !== next.workingSlotId
  ) {
    return 'Card/folder selection changed';
  }
  if (previous.previewMode !== next.previewMode) return 'Preview mode changed';
  if (!areStringArraysEqual(previous.compositeAssetIds, next.compositeAssetIds)) {
    return 'Composite references changed';
  }
  if (
    JSON.stringify(previous.paramsState) !== JSON.stringify(next.paramsState) ||
    JSON.stringify(previous.paramSpecs) !== JSON.stringify(next.paramSpecs) ||
    JSON.stringify(previous.paramUiOverrides) !== JSON.stringify(next.paramUiOverrides)
  ) {
    return 'Control parameters changed';
  }
  if (
    previous.validatorEnabled !== next.validatorEnabled ||
    previous.formatterEnabled !== next.formatterEnabled
  ) {
    return 'Validator/formatter toggled';
  }
  if (JSON.stringify(previous.studioSettings) !== JSON.stringify(next.studioSettings)) {
    return 'Generation settings changed';
  }
  return 'Editor state changed';
};

export function useRightSidebarActionHistory({
  actionHistoryMaxSteps,
  applySnapshot,
  projectId,
  snapshotInput,
}: UseRightSidebarActionHistoryArgs): UseRightSidebarActionHistoryResult {
  const [actionHistoryEntries, setActionHistoryEntries] = useState<StudioActionHistoryEntry[]>([]);
  const [activeActionHistoryIndex, setActiveActionHistoryIndex] = useState(-1);
  const [pendingRestoreIndex, setPendingRestoreIndex] = useState<number | null>(null);
  const isApplyingActionHistoryRef = useRef(false);
  const applyingActionHistorySignatureRef = useRef<string | null>(null);
  const actionHistoryEntriesRef = useRef<StudioActionHistoryEntry[]>([]);
  const activeActionHistoryIndexRef = useRef(-1);

  const applyActionHistoryEntry = useCallback((entry: StudioActionHistoryEntry): void => {
    isApplyingActionHistoryRef.current = true;
    applyingActionHistorySignatureRef.current = entry.signature;
    applySnapshot(entry.snapshot);
  }, [applySnapshot]);

  useEffect(() => {
    actionHistoryEntriesRef.current = actionHistoryEntries;
  }, [actionHistoryEntries]);

  useEffect(() => {
    activeActionHistoryIndexRef.current = activeActionHistoryIndex;
  }, [activeActionHistoryIndex]);

  useEffect(() => {
    if (pendingRestoreIndex === null) return;
    const targetEntry = actionHistoryEntriesRef.current[pendingRestoreIndex];
    if (targetEntry) {
      applyActionHistoryEntry(targetEntry);
    }
    setPendingRestoreIndex(null);
  }, [pendingRestoreIndex, applyActionHistoryEntry]);

  const handleUndoAction = useCallback((): void => {
    const prevIndex = activeActionHistoryIndexRef.current;
    if (prevIndex <= 0) return;
    const nextIndex = prevIndex - 1;
    setActiveActionHistoryIndex(nextIndex);
    setPendingRestoreIndex(nextIndex);
  }, []);

  const handleRedoAction = useCallback((): void => {
    const prevIndex = activeActionHistoryIndexRef.current;
    const maxIndex = actionHistoryEntriesRef.current.length - 1;
    if (prevIndex < 0 || prevIndex >= maxIndex) return;
    const nextIndex = prevIndex + 1;
    setActiveActionHistoryIndex(nextIndex);
    setPendingRestoreIndex(nextIndex);
  }, []);

  const handleRestoreActionStep = useCallback((targetIndex: number): void => {
    const entries = actionHistoryEntriesRef.current;
    const currentIndex = activeActionHistoryIndexRef.current;
    if (targetIndex < 0 || targetIndex >= entries.length) return;
    if (targetIndex === currentIndex) return;
    setActiveActionHistoryIndex(targetIndex);
    setPendingRestoreIndex(targetIndex);
  }, []);

  useEffect(() => {
    setActionHistoryEntries([]);
    setActiveActionHistoryIndex(-1);
    setPendingRestoreIndex(null);
    isApplyingActionHistoryRef.current = false;
    applyingActionHistorySignatureRef.current = null;
  }, [projectId]);

  useEffect(() => {
    const snapshot = buildActionHistorySnapshot(snapshotInput);
    const signature = JSON.stringify(snapshot);

    if (isApplyingActionHistoryRef.current) {
      if (applyingActionHistorySignatureRef.current === signature) {
        isApplyingActionHistoryRef.current = false;
        applyingActionHistorySignatureRef.current = null;
      } else {
        // Fallback unlock in case restored state is normalized by other providers.
        isApplyingActionHistoryRef.current = false;
        applyingActionHistorySignatureRef.current = null;
      }
      return;
    }

    setActionHistoryEntries((prevEntries) => {
      const currentEntry = prevEntries[activeActionHistoryIndex];
      if (currentEntry?.signature === signature) return prevEntries;

      const previousSnapshot = currentEntry?.snapshot ?? null;
      const nextEntry: StudioActionHistoryEntry = {
        id: `action_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
        label: resolveActionHistoryLabel(previousSnapshot, snapshot),
        createdAt: new Date().toISOString(),
        signature,
        snapshot,
      };

      const truncated = prevEntries.slice(0, activeActionHistoryIndex + 1);
      const appended = [...truncated, nextEntry];
      const trimmed = appended.slice(-actionHistoryMaxSteps);
      setActiveActionHistoryIndex(trimmed.length - 1);
      return trimmed;
    });
  }, [activeActionHistoryIndex, actionHistoryMaxSteps, snapshotInput]);

  return {
    actionHistoryEntries,
    actionHistoryItems: actionHistoryEntries.map((entry, index) => ({ entry, index })).reverse(),
    activeActionHistoryIndex,
    canRedoAction:
      activeActionHistoryIndex >= 0 &&
      activeActionHistoryIndex < actionHistoryEntries.length - 1,
    canUndoAction: activeActionHistoryIndex > 0,
    handleRedoAction,
    handleRestoreActionStep,
    handleUndoAction,
  };
}

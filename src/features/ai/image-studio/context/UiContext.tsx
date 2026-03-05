'use client';

import React, { createContext, useContext, useMemo, useRef, useState } from 'react';

import type {
  Point2dDto as CanvasImageOffset,
  PositiveRectBoundsDto as PreviewCanvasCropRect,
  PositiveRectBoundsDto as PreviewCanvasImageContentFrame,
} from '@/shared/contracts/geometry';

export type { CanvasImageOffset, PreviewCanvasCropRect, PreviewCanvasImageContentFrame };

export interface PreviewCanvasViewportCrop {
  slotId: string;
  cropRect: PreviewCanvasCropRect;
}

export interface PreviewCanvasImageFrameBinding {
  slotId: string;
  frame: PreviewCanvasImageContentFrame;
}

export type PreviewCanvasViewportCropResolver = () => PreviewCanvasViewportCrop | null;
export type PreviewCanvasImageFrameResolver = () => PreviewCanvasImageFrameBinding | null;
export type ImageTransformMode = 'none' | 'move';
export type PreviewCanvasSize = 'regular' | 'large' | 'xlarge';

export interface PendingSequenceThumbnailState {
  runId: string;
  sourceSlotId: string | null;
  status: 'syncing';
  startedAt: string;
}

const DEFAULT_CANVAS_IMAGE_OFFSET: CanvasImageOffset = { x: 0, y: 0 };
const DEFAULT_CANVAS_BACKGROUND_COLOR = '#ffffff';
const normalizeCanvasImageOffset = (offset: CanvasImageOffset): CanvasImageOffset => ({
  x: Number.isFinite(offset.x) ? offset.x : 0,
  y: Number.isFinite(offset.y) ? offset.y : 0,
});
const normalizeCanvasBackgroundColor = (value: string): string => {
  const normalized = value.trim().toLowerCase();
  if (/^#[0-9a-f]{6}$/.test(normalized)) return normalized;
  return DEFAULT_CANVAS_BACKGROUND_COLOR;
};

// --- Granular State Interfaces ---

export interface UiLayoutState {
  isFocusMode: boolean;
}

export interface UiCanvasState {
  previewCanvasSize: PreviewCanvasSize;
  imageTransformMode: ImageTransformMode;
  canvasImageOffset: CanvasImageOffset;
  canvasBackgroundLayerEnabled: boolean;
  canvasBackgroundColor: string;
}

export interface UiToolsState {
  maskPreviewEnabled: boolean;
  centerGuidesEnabled: boolean;
  validatorEnabled: boolean;
  formatterEnabled: boolean;
  canvasSelectionEnabled: boolean;
}

export interface UiSequenceState {
  pendingSequenceThumbnail: PendingSequenceThumbnailState | null;
}

export interface UiState extends UiLayoutState, UiCanvasState, UiToolsState, UiSequenceState {}

export interface UiActions {
  setIsFocusMode: (value: boolean) => void;
  toggleFocusMode: () => void;
  setMaskPreviewEnabled: (value: boolean) => void;
  setCenterGuidesEnabled: (value: boolean) => void;
  setValidatorEnabled: (value: boolean) => void;
  setFormatterEnabled: (value: boolean) => void;
  setCanvasSelectionEnabled: (value: boolean) => void;
  setPreviewCanvasSize: (size: PreviewCanvasSize) => void;
  setImageTransformMode: (mode: ImageTransformMode) => void;
  setCanvasImageOffset: (offset: CanvasImageOffset) => void;
  resetCanvasImageOffset: () => void;
  setCanvasBackgroundLayerEnabled: (value: boolean) => void;
  setCanvasBackgroundColor: (value: string) => void;
  setPendingSequenceThumbnail: (value: PendingSequenceThumbnailState | null) => void;
  registerPreviewCanvasViewportCropResolver: (
    resolver: PreviewCanvasViewportCropResolver | null
  ) => void;
  getPreviewCanvasViewportCrop: () => PreviewCanvasViewportCrop | null;
  registerPreviewCanvasImageFrameResolver: (
    resolver: PreviewCanvasImageFrameResolver | null
  ) => void;
  getPreviewCanvasImageFrame: () => PreviewCanvasImageFrameBinding | null;
}

const UiLayoutContext = createContext<UiLayoutState | null>(null);
const UiCanvasContext = createContext<UiCanvasState | null>(null);
const UiToolsContext = createContext<UiToolsState | null>(null);
const UiSequenceContext = createContext<UiSequenceState | null>(null);

const UiStateContext = createContext<UiState | null>(null);
const UiActionsContext = createContext<UiActions | null>(null);

export function UiProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [maskPreviewEnabled, setMaskPreviewEnabled] = useState(false);
  const [centerGuidesEnabled, setCenterGuidesEnabled] = useState(false);
  const [validatorEnabled, setValidatorEnabledState] = useState(true);
  const [formatterEnabled, setFormatterEnabledState] = useState(false);
  const [canvasSelectionEnabled, setCanvasSelectionEnabled] = useState(false);
  const [previewCanvasSize, setPreviewCanvasSize] = useState<PreviewCanvasSize>('regular');
  const [imageTransformMode, setImageTransformMode] = useState<ImageTransformMode>('none');
  const [canvasImageOffsetState, setCanvasImageOffsetState] = useState<CanvasImageOffset>(
    DEFAULT_CANVAS_IMAGE_OFFSET
  );
  const [canvasBackgroundLayerEnabled, setCanvasBackgroundLayerEnabled] = useState(true);
  const [canvasBackgroundColor, setCanvasBackgroundColorState] = useState(
    DEFAULT_CANVAS_BACKGROUND_COLOR
  );
  const [pendingSequenceThumbnail, setPendingSequenceThumbnail] =
    useState<PendingSequenceThumbnailState | null>(null);
  const previewCanvasViewportCropResolverRef = useRef<PreviewCanvasViewportCropResolver | null>(
    null
  );
  const previewCanvasImageFrameResolverRef = useRef<PreviewCanvasImageFrameResolver | null>(null);

  const layoutState = useMemo<UiLayoutState>(() => ({ isFocusMode }), [isFocusMode]);
  const canvasState = useMemo<UiCanvasState>(
    () => ({
      previewCanvasSize,
      imageTransformMode,
      canvasImageOffset: canvasImageOffsetState,
      canvasBackgroundLayerEnabled,
      canvasBackgroundColor,
    }),
    [
      previewCanvasSize,
      imageTransformMode,
      canvasImageOffsetState,
      canvasBackgroundLayerEnabled,
      canvasBackgroundColor,
    ]
  );

  const toolsState = useMemo<UiToolsState>(
    () => ({
      maskPreviewEnabled,
      centerGuidesEnabled,
      validatorEnabled,
      formatterEnabled,
      canvasSelectionEnabled,
    }),
    [
      maskPreviewEnabled,
      centerGuidesEnabled,
      validatorEnabled,
      formatterEnabled,
      canvasSelectionEnabled,
    ]
  );

  const sequenceState = useMemo<UiSequenceState>(
    () => ({ pendingSequenceThumbnail }),
    [pendingSequenceThumbnail]
  );

  const state = useMemo<UiState>(
    () => ({
      ...layoutState,
      ...canvasState,
      ...toolsState,
      ...sequenceState,
    }),
    [layoutState, canvasState, toolsState, sequenceState]
  );

  const actions = useMemo<UiActions>(
    () => ({
      setIsFocusMode,
      toggleFocusMode: () => {
        setIsFocusMode((prev) => !prev);
      },
      setMaskPreviewEnabled,
      setCenterGuidesEnabled,
      setValidatorEnabled: (value: boolean): void => {
        setValidatorEnabledState(value);
        if (!value) {
          setFormatterEnabledState(false);
        }
      },
      setFormatterEnabled: (value: boolean): void => {
        setFormatterEnabledState(value);
      },
      setCanvasSelectionEnabled,
      setPreviewCanvasSize,
      setImageTransformMode,
      setCanvasImageOffset: (offset: CanvasImageOffset): void => {
        setCanvasImageOffsetState(normalizeCanvasImageOffset(offset));
      },
      resetCanvasImageOffset: (): void => {
        setCanvasImageOffsetState(DEFAULT_CANVAS_IMAGE_OFFSET);
      },
      setCanvasBackgroundLayerEnabled,
      setCanvasBackgroundColor: (value: string): void => {
        setCanvasBackgroundColorState(normalizeCanvasBackgroundColor(value));
      },
      setPendingSequenceThumbnail,
      registerPreviewCanvasViewportCropResolver: (
        resolver: PreviewCanvasViewportCropResolver | null
      ): void => {
        previewCanvasViewportCropResolverRef.current = resolver;
      },
      getPreviewCanvasViewportCrop: (): PreviewCanvasViewportCrop | null =>
        previewCanvasViewportCropResolverRef.current?.() ?? null,
      registerPreviewCanvasImageFrameResolver: (
        resolver: PreviewCanvasImageFrameResolver | null
      ): void => {
        previewCanvasImageFrameResolverRef.current = resolver;
      },
      getPreviewCanvasImageFrame: (): PreviewCanvasImageFrameBinding | null =>
        previewCanvasImageFrameResolverRef.current?.() ?? null,
    }),
    []
  );

  return (
    <UiActionsContext.Provider value={actions}>
      <UiLayoutContext.Provider value={layoutState}>
        <UiCanvasContext.Provider value={canvasState}>
          <UiToolsContext.Provider value={toolsState}>
            <UiSequenceContext.Provider value={sequenceState}>
              <UiStateContext.Provider value={state}>{children}</UiStateContext.Provider>
            </UiSequenceContext.Provider>
          </UiToolsContext.Provider>
        </UiCanvasContext.Provider>
      </UiLayoutContext.Provider>
    </UiActionsContext.Provider>
  );
}

export function useUiLayoutState(): UiLayoutState {
  const ctx = useContext(UiLayoutContext);
  if (!ctx) throw new Error('useUiLayoutState must be used within a UiProvider');
  return ctx;
}

export function useUiCanvasState(): UiCanvasState {
  const ctx = useContext(UiCanvasContext);
  if (!ctx) throw new Error('useUiCanvasState must be used within a UiProvider');
  return ctx;
}

export function useUiToolsState(): UiToolsState {
  const ctx = useContext(UiToolsContext);
  if (!ctx) throw new Error('useUiToolsState must be used within a UiProvider');
  return ctx;
}

export function useUiSequenceState(): UiSequenceState {
  const ctx = useContext(UiSequenceContext);
  if (!ctx) throw new Error('useUiSequenceState must be used within a UiProvider');
  return ctx;
}

export function useUiState(): UiState {
  const ctx = useContext(UiStateContext);
  if (!ctx) throw new Error('useUiState must be used within a UiProvider');
  return ctx;
}

export function useUiActions(): UiActions {
  const ctx = useContext(UiActionsContext);
  if (!ctx) throw new Error('useUiActions must be used within a UiProvider');
  return ctx;
}

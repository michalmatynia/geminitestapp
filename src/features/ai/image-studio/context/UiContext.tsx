'use client';

import React, { createContext, useContext, useMemo, useRef, useState } from 'react';

export interface PreviewCanvasCropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PreviewCanvasViewportCrop {
  slotId: string;
  cropRect: PreviewCanvasCropRect;
}

export interface PreviewCanvasImageContentFrame {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PreviewCanvasImageFrameBinding {
  slotId: string;
  frame: PreviewCanvasImageContentFrame;
}

export type PreviewCanvasViewportCropResolver = () => PreviewCanvasViewportCrop | null;
export type PreviewCanvasImageFrameResolver = () => PreviewCanvasImageFrameBinding | null;
export type ImageTransformMode = 'none' | 'move';
export type PreviewCanvasSize = 'regular' | 'large' | 'xlarge';

export interface CanvasImageOffset {
  x: number;
  y: number;
}

export interface PendingSequenceThumbnailState {
  runId: string;
  sourceSlotId: string | null;
  status: 'syncing';
  startedAt: string;
}

const DEFAULT_CANVAS_IMAGE_OFFSET: CanvasImageOffset = { x: 0, y: 0 };
const normalizeCanvasImageOffset = (offset: CanvasImageOffset): CanvasImageOffset => ({
  x: Number.isFinite(offset.x) ? offset.x : 0,
  y: Number.isFinite(offset.y) ? offset.y : 0,
});

export interface UiState {
  isFocusMode: boolean;
  maskPreviewEnabled: boolean;
  centerGuidesEnabled: boolean;
  validatorEnabled: boolean;
  formatterEnabled: boolean;
  canvasSelectionEnabled: boolean;
  previewCanvasSize: PreviewCanvasSize;
  imageTransformMode: ImageTransformMode;
  canvasImageOffset: CanvasImageOffset;
  pendingSequenceThumbnail: PendingSequenceThumbnailState | null;
}

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
  setPendingSequenceThumbnail: (value: PendingSequenceThumbnailState | null) => void;
  registerPreviewCanvasViewportCropResolver: (resolver: PreviewCanvasViewportCropResolver | null) => void;
  getPreviewCanvasViewportCrop: () => PreviewCanvasViewportCrop | null;
  registerPreviewCanvasImageFrameResolver: (resolver: PreviewCanvasImageFrameResolver | null) => void;
  getPreviewCanvasImageFrame: () => PreviewCanvasImageFrameBinding | null;
}

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
  const [canvasImageOffsetState, setCanvasImageOffsetState] = useState<CanvasImageOffset>(DEFAULT_CANVAS_IMAGE_OFFSET);
  const [pendingSequenceThumbnail, setPendingSequenceThumbnail] = useState<PendingSequenceThumbnailState | null>(null);
  const previewCanvasViewportCropResolverRef = useRef<PreviewCanvasViewportCropResolver | null>(null);
  const previewCanvasImageFrameResolverRef = useRef<PreviewCanvasImageFrameResolver | null>(null);

  const state = useMemo<UiState>(
    () => ({
      isFocusMode,
      maskPreviewEnabled,
      centerGuidesEnabled,
      validatorEnabled,
      formatterEnabled,
      canvasSelectionEnabled,
      previewCanvasSize,
      imageTransformMode,
      canvasImageOffset: canvasImageOffsetState,
      pendingSequenceThumbnail,
    }),
    [
      centerGuidesEnabled,
      canvasSelectionEnabled,
      previewCanvasSize,
      formatterEnabled,
      imageTransformMode,
      isFocusMode,
      maskPreviewEnabled,
      validatorEnabled,
      canvasImageOffsetState,
      pendingSequenceThumbnail,
    ]
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
      setPendingSequenceThumbnail,
      registerPreviewCanvasViewportCropResolver: (resolver: PreviewCanvasViewportCropResolver | null): void => {
        previewCanvasViewportCropResolverRef.current = resolver;
      },
      getPreviewCanvasViewportCrop: (): PreviewCanvasViewportCrop | null =>
        previewCanvasViewportCropResolverRef.current?.() ?? null,
      registerPreviewCanvasImageFrameResolver: (resolver: PreviewCanvasImageFrameResolver | null): void => {
        previewCanvasImageFrameResolverRef.current = resolver;
      },
      getPreviewCanvasImageFrame: (): PreviewCanvasImageFrameBinding | null =>
        previewCanvasImageFrameResolverRef.current?.() ?? null,
    }),
    []
  );

  return (
    <UiActionsContext.Provider value={actions}>
      <UiStateContext.Provider value={state}>
        {children}
      </UiStateContext.Provider>
    </UiActionsContext.Provider>
  );
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

export function useUi(): UiState & UiActions {
  return { ...useUiState(), ...useUiActions() };
}

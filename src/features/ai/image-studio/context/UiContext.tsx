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

export type PreviewCanvasViewportCropResolver = () => PreviewCanvasViewportCrop | null;

export interface UiState {
  isFocusMode: boolean;
  maskPreviewEnabled: boolean;
  centerGuidesEnabled: boolean;
  validatorEnabled: boolean;
  formatterEnabled: boolean;
}

export interface UiActions {
  setIsFocusMode: (value: boolean) => void;
  toggleFocusMode: () => void;
  setMaskPreviewEnabled: (value: boolean) => void;
  setCenterGuidesEnabled: (value: boolean) => void;
  setValidatorEnabled: (value: boolean) => void;
  setFormatterEnabled: (value: boolean) => void;
  registerPreviewCanvasViewportCropResolver: (resolver: PreviewCanvasViewportCropResolver | null) => void;
  getPreviewCanvasViewportCrop: () => PreviewCanvasViewportCrop | null;
}

const UiStateContext = createContext<UiState | null>(null);
const UiActionsContext = createContext<UiActions | null>(null);

export function UiProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [maskPreviewEnabled, setMaskPreviewEnabled] = useState(false);
  const [centerGuidesEnabled, setCenterGuidesEnabled] = useState(false);
  const [validatorEnabled, setValidatorEnabledState] = useState(true);
  const [formatterEnabled, setFormatterEnabledState] = useState(false);
  const previewCanvasViewportCropResolverRef = useRef<PreviewCanvasViewportCropResolver | null>(null);

  const state = useMemo<UiState>(
    () => ({
      isFocusMode,
      maskPreviewEnabled,
      centerGuidesEnabled,
      validatorEnabled,
      formatterEnabled,
    }),
    [centerGuidesEnabled, formatterEnabled, isFocusMode, maskPreviewEnabled, validatorEnabled]
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
      registerPreviewCanvasViewportCropResolver: (resolver: PreviewCanvasViewportCropResolver | null): void => {
        previewCanvasViewportCropResolverRef.current = resolver;
      },
      getPreviewCanvasViewportCrop: (): PreviewCanvasViewportCrop | null =>
        previewCanvasViewportCropResolverRef.current?.() ?? null,
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

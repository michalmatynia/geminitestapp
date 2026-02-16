'use client';

import React, { createContext, useContext, useMemo, useState } from 'react';

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
}

const UiStateContext = createContext<UiState | null>(null);
const UiActionsContext = createContext<UiActions | null>(null);

export function UiProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [maskPreviewEnabled, setMaskPreviewEnabled] = useState(false);
  const [centerGuidesEnabled, setCenterGuidesEnabled] = useState(false);
  const [validatorEnabled, setValidatorEnabledState] = useState(true);
  const [formatterEnabled, setFormatterEnabledState] = useState(false);

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

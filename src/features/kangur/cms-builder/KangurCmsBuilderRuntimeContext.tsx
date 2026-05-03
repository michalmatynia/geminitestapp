'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';

import type { SectionInstance } from '@/shared/contracts/cms';
import { internalError } from '@/features/kangur/shared/errors/app-error';

import type { KangurCmsProject, KangurCmsScreenKey } from './project';

import type { KangurThemeMode } from '../appearance/theme-settings';
import type { ThemeSettings } from '@/shared/contracts/cms-theme';

type KangurCmsBuilderRuntimeContextValue = {
  draftProject: KangurCmsProject;
  savedProject: KangurCmsProject;
  activeScreenKey: KangurCmsScreenKey;
  onSwitchScreen: (nextScreenKey: KangurCmsScreenKey, sections: SectionInstance[]) => void;
  onSave: (sections: SectionInstance[]) => Promise<void>;
  isSaving: boolean;
  themePreviewMode: KangurThemeMode;
  themePreviewFallbacks: Record<KangurThemeMode, ThemeSettings>;
  setThemePreviewMode: (mode: KangurThemeMode) => void;
};

type KangurCmsBuilderRuntimeStateContextValue = Pick<
  KangurCmsBuilderRuntimeContextValue,
  'draftProject' | 'savedProject' | 'activeScreenKey' | 'isSaving' | 'themePreviewMode' | 'themePreviewFallbacks'
>;

type KangurCmsBuilderRuntimeActionsContextValue = Pick<
  KangurCmsBuilderRuntimeContextValue,
  'onSwitchScreen' | 'onSave' | 'setThemePreviewMode'
>;

const KangurCmsBuilderRuntimeStateContext =
  createContext<KangurCmsBuilderRuntimeStateContextValue | null>(null);
const KangurCmsBuilderRuntimeActionsContext =
  createContext<KangurCmsBuilderRuntimeActionsContextValue | null>(null);

export function KangurCmsBuilderRuntimeProvider({
  children,
  draftProject,
  savedProject,
  activeScreenKey,
  onSwitchScreen,
  onSave,
  isSaving,
  themePreviewMode,
  themePreviewFallbacks,
  setThemePreviewMode,
}: KangurCmsBuilderRuntimeContextValue & {
  children: ReactNode;
}): React.JSX.Element {
  const stateValue = useMemo<KangurCmsBuilderRuntimeStateContextValue>(
    () => ({
      draftProject,
      savedProject,
      activeScreenKey,
      isSaving,
      themePreviewMode,
      themePreviewFallbacks,
    }),
    [activeScreenKey, draftProject, isSaving, savedProject, themePreviewMode, themePreviewFallbacks]
  );
  const actionsValue = useMemo<KangurCmsBuilderRuntimeActionsContextValue>(
    () => ({
      onSwitchScreen,
      onSave,
      setThemePreviewMode,
    }),
    [onSave, onSwitchScreen, setThemePreviewMode]
  );

  return (
    <KangurCmsBuilderRuntimeActionsContext.Provider value={actionsValue}>
      <KangurCmsBuilderRuntimeStateContext.Provider value={stateValue}>
        {children}
      </KangurCmsBuilderRuntimeStateContext.Provider>
    </KangurCmsBuilderRuntimeActionsContext.Provider>
  );
}

export const useKangurCmsBuilderRuntimeState = (): KangurCmsBuilderRuntimeStateContextValue => {
  const context = useContext(KangurCmsBuilderRuntimeStateContext);

  if (!context) {
    throw internalError(
      'useKangurCmsBuilderRuntimeState must be used within a KangurCmsBuilderRuntimeProvider'
    );
  }

  return context;
};

export const useKangurCmsBuilderRuntimeActions =
  (): KangurCmsBuilderRuntimeActionsContextValue => {
    const context = useContext(KangurCmsBuilderRuntimeActionsContext);

    if (!context) {
      throw internalError(
        'useKangurCmsBuilderRuntimeActions must be used within a KangurCmsBuilderRuntimeProvider'
      );
    }

    return context;
  };

export const useKangurCmsBuilderRuntime = (): KangurCmsBuilderRuntimeContextValue => {
  const state = useContext(KangurCmsBuilderRuntimeStateContext);
  const actions = useContext(KangurCmsBuilderRuntimeActionsContext);
  if (!state || !actions) {
    throw internalError(
      'useKangurCmsBuilderRuntime must be used within a KangurCmsBuilderRuntimeProvider'
    );
  }
  return useMemo(() => ({ ...state, ...actions }), [actions, state]);
};

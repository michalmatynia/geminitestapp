'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';

import type { SectionInstance } from '@/shared/contracts/cms';

import type { KangurCmsProject, KangurCmsScreenKey } from './project';
import { internalError } from '@/shared/errors/app-error';

type KangurCmsBuilderRuntimeContextValue = {
  draftProject: KangurCmsProject;
  savedProject: KangurCmsProject;
  activeScreenKey: KangurCmsScreenKey;
  onSwitchScreen: (nextScreenKey: KangurCmsScreenKey, sections: SectionInstance[]) => void;
  onSave: (sections: SectionInstance[]) => Promise<void>;
  isSaving: boolean;
};

const KangurCmsBuilderRuntimeContext = createContext<KangurCmsBuilderRuntimeContextValue | null>(
  null
);

export function KangurCmsBuilderRuntimeProvider({
  children,
  draftProject,
  savedProject,
  activeScreenKey,
  onSwitchScreen,
  onSave,
  isSaving,
}: KangurCmsBuilderRuntimeContextValue & {
  children: ReactNode;
}): React.JSX.Element {
  const value = useMemo<KangurCmsBuilderRuntimeContextValue>(
    () => ({
      draftProject,
      savedProject,
      activeScreenKey,
      onSwitchScreen,
      onSave,
      isSaving,
    }),
    [activeScreenKey, draftProject, isSaving, onSave, onSwitchScreen, savedProject]
  );

  return (
    <KangurCmsBuilderRuntimeContext.Provider value={value}>
      {children}
    </KangurCmsBuilderRuntimeContext.Provider>
  );
}

export const useKangurCmsBuilderRuntime = (): KangurCmsBuilderRuntimeContextValue => {
  const context = useContext(KangurCmsBuilderRuntimeContext);

  if (!context) {
    throw internalError(
      'useKangurCmsBuilderRuntime must be used within a KangurCmsBuilderRuntimeProvider'
    );
  }

  return context;
};

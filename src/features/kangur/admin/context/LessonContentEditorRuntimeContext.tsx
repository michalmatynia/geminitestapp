'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';

import { internalError } from '@/features/kangur/shared/errors/app-error';

type LessonContentEditorRuntimeContextValue = {
  isSaving: boolean;
  onClose: () => void;
  onSave: () => void;
  onImportLegacy: () => void;
  onClearContent: () => void;
};

type LessonContentEditorRuntimeStateContextValue = Pick<
  LessonContentEditorRuntimeContextValue,
  'isSaving'
>;

type LessonContentEditorRuntimeActionsContextValue = Pick<
  LessonContentEditorRuntimeContextValue,
  'onClose' | 'onSave' | 'onImportLegacy' | 'onClearContent'
>;

const LessonContentEditorRuntimeStateContext =
  createContext<LessonContentEditorRuntimeStateContextValue | null>(null);
const LessonContentEditorRuntimeActionsContext =
  createContext<LessonContentEditorRuntimeActionsContextValue | null>(null);

type LessonContentEditorRuntimeProviderProps = LessonContentEditorRuntimeContextValue & {
  children: ReactNode;
};

export function LessonContentEditorRuntimeProvider({
  isSaving,
  onClose,
  onSave,
  onImportLegacy,
  onClearContent,
  children,
}: LessonContentEditorRuntimeProviderProps): React.JSX.Element {
  const stateValue = useMemo<LessonContentEditorRuntimeStateContextValue>(
    () => ({
      isSaving,
    }),
    [isSaving]
  );
  const actionsValue = useMemo<LessonContentEditorRuntimeActionsContextValue>(
    () => ({
      onClose,
      onSave,
      onImportLegacy,
      onClearContent,
    }),
    [onClearContent, onClose, onImportLegacy, onSave]
  );

  return (
    <LessonContentEditorRuntimeActionsContext.Provider value={actionsValue}>
      <LessonContentEditorRuntimeStateContext.Provider value={stateValue}>
        {children}
      </LessonContentEditorRuntimeStateContext.Provider>
    </LessonContentEditorRuntimeActionsContext.Provider>
  );
}

export function useLessonContentEditorRuntimeState(): LessonContentEditorRuntimeStateContextValue {
  const context = useContext(LessonContentEditorRuntimeStateContext);
  if (!context) {
    throw internalError(
      'useLessonContentEditorRuntimeState must be used within a LessonContentEditorRuntimeProvider'
    );
  }
  return context;
}

export function useLessonContentEditorRuntimeActions():
  LessonContentEditorRuntimeActionsContextValue {
  const context = useContext(LessonContentEditorRuntimeActionsContext);
  if (!context) {
    throw internalError(
      'useLessonContentEditorRuntimeActions must be used within a LessonContentEditorRuntimeProvider'
    );
  }
  return context;
}

export function useLessonContentEditorRuntimeContext(): LessonContentEditorRuntimeContextValue {
  const state = useContext(LessonContentEditorRuntimeStateContext);
  const actions = useContext(LessonContentEditorRuntimeActionsContext);
  if (!state || !actions) {
    throw internalError(
      'useLessonContentEditorRuntimeContext must be used within a LessonContentEditorRuntimeProvider'
    );
  }
  return useMemo(() => ({ ...state, ...actions }), [actions, state]);
}

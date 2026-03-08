'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { internalError } from '@/shared/errors/app-error';

type LessonContentEditorRuntimeContextValue = {
  isSaving: boolean;
  onClose: () => void;
  onSave: () => void;
  onImportLegacy: () => void;
  onClearContent: () => void;
};

const LessonContentEditorRuntimeContext =
  createContext<LessonContentEditorRuntimeContextValue | null>(null);

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
  const value = useMemo(
    () => ({
      isSaving,
      onClose,
      onSave,
      onImportLegacy,
      onClearContent,
    }),
    [isSaving, onClearContent, onClose, onImportLegacy, onSave]
  );

  return (
    <LessonContentEditorRuntimeContext.Provider value={value}>
      {children}
    </LessonContentEditorRuntimeContext.Provider>
  );
}

export function useLessonContentEditorRuntimeContext(): LessonContentEditorRuntimeContextValue {
  const context = useContext(LessonContentEditorRuntimeContext);
  if (!context) {
    throw internalError(
      'useLessonContentEditorRuntimeContext must be used within a LessonContentEditorRuntimeProvider'
    );
  }
  return context;
}

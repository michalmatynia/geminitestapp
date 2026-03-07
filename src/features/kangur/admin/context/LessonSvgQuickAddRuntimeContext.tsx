'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';

import type { KangurLesson } from '@/shared/contracts/kangur';

type LessonSvgQuickAddRuntimeContextValue = {
  lesson: KangurLesson | null;
  initialMarkup: string;
  isOpen: boolean;
  isSaving: boolean;
  onClose: () => void;
  onSave: (markup: string, viewBox: string) => void;
};

const LessonSvgQuickAddRuntimeContext =
  createContext<LessonSvgQuickAddRuntimeContextValue | null>(null);

type LessonSvgQuickAddRuntimeProviderProps = LessonSvgQuickAddRuntimeContextValue & {
  children: ReactNode;
};

export function LessonSvgQuickAddRuntimeProvider({
  lesson,
  initialMarkup,
  isOpen,
  isSaving,
  onClose,
  onSave,
  children,
}: LessonSvgQuickAddRuntimeProviderProps): React.JSX.Element {
  const value = useMemo(
    () => ({
      lesson,
      initialMarkup,
      isOpen,
      isSaving,
      onClose,
      onSave,
    }),
    [initialMarkup, isOpen, isSaving, lesson, onClose, onSave]
  );

  return (
    <LessonSvgQuickAddRuntimeContext.Provider value={value}>
      {children}
    </LessonSvgQuickAddRuntimeContext.Provider>
  );
}

export function useLessonSvgQuickAddRuntimeContext(): LessonSvgQuickAddRuntimeContextValue {
  const context = useContext(LessonSvgQuickAddRuntimeContext);
  if (!context) {
    throw new Error(
      'useLessonSvgQuickAddRuntimeContext must be used within a LessonSvgQuickAddRuntimeProvider'
    );
  }
  return context;
}

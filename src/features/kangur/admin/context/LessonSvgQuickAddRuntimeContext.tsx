'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';

import type { KangurLesson } from '@/shared/contracts/kangur';
import { internalError } from '@/shared/errors/app-error';

type LessonSvgQuickAddRuntimeContextValue = {
  lesson: KangurLesson | null;
  initialMarkup: string;
  isOpen: boolean;
  isSaving: boolean;
  onClose: () => void;
  onSave: (markup: string, viewBox: string) => void;
};

type LessonSvgQuickAddRuntimeStateContextValue = Pick<
  LessonSvgQuickAddRuntimeContextValue,
  'lesson' | 'initialMarkup' | 'isOpen' | 'isSaving'
>;

type LessonSvgQuickAddRuntimeActionsContextValue = Pick<
  LessonSvgQuickAddRuntimeContextValue,
  'onClose' | 'onSave'
>;

const LessonSvgQuickAddRuntimeStateContext =
  createContext<LessonSvgQuickAddRuntimeStateContextValue | null>(null);
const LessonSvgQuickAddRuntimeActionsContext =
  createContext<LessonSvgQuickAddRuntimeActionsContextValue | null>(null);

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
  const stateValue = useMemo<LessonSvgQuickAddRuntimeStateContextValue>(
    () => ({
      lesson,
      initialMarkup,
      isOpen,
      isSaving,
    }),
    [initialMarkup, isOpen, isSaving, lesson]
  );
  const actionsValue = useMemo<LessonSvgQuickAddRuntimeActionsContextValue>(
    () => ({
      onClose,
      onSave,
    }),
    [onClose, onSave]
  );

  return (
    <LessonSvgQuickAddRuntimeActionsContext.Provider value={actionsValue}>
      <LessonSvgQuickAddRuntimeStateContext.Provider value={stateValue}>
        {children}
      </LessonSvgQuickAddRuntimeStateContext.Provider>
    </LessonSvgQuickAddRuntimeActionsContext.Provider>
  );
}

export function useLessonSvgQuickAddRuntimeState(): LessonSvgQuickAddRuntimeStateContextValue {
  const context = useContext(LessonSvgQuickAddRuntimeStateContext);
  if (!context) {
    throw internalError(
      'useLessonSvgQuickAddRuntimeState must be used within a LessonSvgQuickAddRuntimeProvider'
    );
  }
  return context;
}

export function useLessonSvgQuickAddRuntimeActions(): LessonSvgQuickAddRuntimeActionsContextValue {
  const context = useContext(LessonSvgQuickAddRuntimeActionsContext);
  if (!context) {
    throw internalError(
      'useLessonSvgQuickAddRuntimeActions must be used within a LessonSvgQuickAddRuntimeProvider'
    );
  }
  return context;
}

export function useLessonSvgQuickAddRuntimeContext(): LessonSvgQuickAddRuntimeContextValue {
  const state = useContext(LessonSvgQuickAddRuntimeStateContext);
  const actions = useContext(LessonSvgQuickAddRuntimeActionsContext);
  if (!state || !actions) {
    throw internalError(
      'useLessonSvgQuickAddRuntimeContext must be used within a LessonSvgQuickAddRuntimeProvider'
    );
  }
  return useMemo(() => ({ ...state, ...actions }), [actions, state]);
}

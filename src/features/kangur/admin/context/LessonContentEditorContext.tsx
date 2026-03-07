'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { KangurLesson, KangurLessonDocument } from '@/shared/contracts/kangur';

type LessonContentEditorContextValue = {
  lesson: KangurLesson | null;
  document: KangurLessonDocument;
  onChange: (next: KangurLessonDocument) => void;
};

const LessonContentEditorContext = createContext<LessonContentEditorContextValue | null>(null);

type Props = {
  lesson: KangurLesson | null;
  document: KangurLessonDocument;
  onChange: (next: KangurLessonDocument) => void;
  children: ReactNode;
};

export function LessonContentEditorProvider({
  lesson,
  document,
  onChange,
  children,
}: Props): React.JSX.Element {
  const value = useMemo(
    () => ({
      lesson,
      document,
      onChange,
    }),
    [lesson, document, onChange]
  );

  return (
    <LessonContentEditorContext.Provider value={value}>
      {children}
    </LessonContentEditorContext.Provider>
  );
}

export function useLessonContentEditorContext(): LessonContentEditorContextValue {
  const context = useContext(LessonContentEditorContext);
  if (!context) {
    throw new Error(
      'useLessonContentEditorContext must be used within a LessonContentEditorProvider'
    );
  }
  return context;
}

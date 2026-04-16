'use client';

import { createContext, useContext } from 'react';
import { internalError } from '@/shared/errors/app-error';

type ExamNavigationContextValue = {
  onPrev: () => void;
  onNext: () => void;
  prevDisabled: boolean;
  nextDisabled: boolean;
  prevLabel: string;
  nextLabel: string;
  progressLabel?: string;
  progressAriaLabel?: string;
};

const ExamNavigationContext = createContext<ExamNavigationContextValue | null>(null);

export const ExamNavigationProvider = ExamNavigationContext.Provider;

export function useExamNavigation(): ExamNavigationContextValue {
  const context = useContext(ExamNavigationContext);
  if (!context) {
    throw internalError('useExamNavigation must be used within an ExamNavigationProvider');
  }
  return context;
}

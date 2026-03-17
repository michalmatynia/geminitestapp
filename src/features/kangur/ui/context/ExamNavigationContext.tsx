import { createContext, useContext } from 'react';

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

export function useExamNavigation() {
  const context = useContext(ExamNavigationContext);
  if (!context) {
    throw new Error('useExamNavigation must be used within an ExamNavigationProvider');
  }
  return context;
}

'use client';

import React, { createContext, useContext } from 'react';
import type { 
  KangurGameOperationSelectorTranslations,
  KangurOperationSelectorRecommendation,
  KangurGameOperationSelectorRuntime,
} from './KangurGameOperationSelectorWidget.types';
import type { getOperationSelectorFallbackCopy } from './KangurGameOperationSelectorWidget.copy';

export type KangurGameOperationSelectorContextValue = {
  basePath: string;
  fallbackCopy: ReturnType<typeof getOperationSelectorFallbackCopy>;
  gamePageTranslations: KangurGameOperationSelectorTranslations;
  isSixYearOld: boolean;
  locale: string;
  mixedPracticeAssignment: any; // Using any for brevity if type is complex
  normalizedProgress: any;
  quickPracticeDescription: string;
  quickPracticeGameChipLabel: string;
  quickPracticeTitle: string;
  recommendation: KangurOperationSelectorRecommendation | null;
  recommendedLessonQuizScreen: string | null;
  setScreen: KangurGameOperationSelectorRuntime['setScreen'];
  showMathSections: boolean;
  suggestedTraining: any;
  trainingSetupTitle: string;
  trainingWordmarkLabel: string;
  handleHome: () => void;
  handleStartTraining: any;
  handleSelectOperation: any;
  practiceAssignmentsByOperation: any;
};

const KangurGameOperationSelectorContext = createContext<KangurGameOperationSelectorContextValue | null>(null);

export function KangurGameOperationSelectorProvider({
  children,
  value,
}: {
  children: React.ReactNode;
  value: KangurGameOperationSelectorContextValue;
}) {
  return (
    <KangurGameOperationSelectorContext.Provider value={value}>
      {children}
    </KangurGameOperationSelectorContext.Provider>
  );
}

export function useKangurGameOperationSelector(): KangurGameOperationSelectorContextValue {
  const context = useContext(KangurGameOperationSelectorContext);
  if (!context) {
    throw new Error('useKangurGameOperationSelector must be used within a KangurGameOperationSelectorProvider');
  }
  return context;
}

'use client';

import React, { createContext, useContext } from 'react';
import type { 
  KangurGameOperationSelectorTranslations,
  KangurOperationSelectorRecommendation,
  KangurGameOperationSelectorRuntime,
  KangurGameOperationSelectorAssignment,
} from './KangurGameOperationSelectorWidget.types';
import type { getOperationSelectorFallbackCopy } from './KangurGameOperationSelectorWidget.copy';
import type { getRecommendedTrainingSetup } from '@/features/kangur/ui/services/game-setup-recommendations';

export type KangurGameOperationSelectorContextValue = {
  basePath: string;
  fallbackCopy: ReturnType<typeof getOperationSelectorFallbackCopy>;
  gamePageTranslations: KangurGameOperationSelectorTranslations;
  isSixYearOld: boolean;
  locale: string;
  mixedPracticeAssignment: KangurGameOperationSelectorAssignment;
  operationPracticeAssignment: KangurGameOperationSelectorAssignment;
  normalizedProgress: KangurGameOperationSelectorRuntime['progress'];
  quickPracticeDescription: string;
  quickPracticeGameChipLabel: string;
  quickPracticeTitle: string;
  recommendation: KangurOperationSelectorRecommendation | null;
  recommendedLessonQuizScreen: string | null;
  setScreen: KangurGameOperationSelectorRuntime['setScreen'];
  showMathSections: boolean;
  suggestedTraining: ReturnType<typeof getRecommendedTrainingSetup>;
  trainingSetupTitle: string;
  trainingWordmarkLabel: string;
  compactActionClassName: string;
  handleHome: () => void;
  handleStartTraining: KangurGameOperationSelectorRuntime['handleStartTraining'];
  handleSelectOperation: KangurGameOperationSelectorRuntime['handleSelectOperation'];
  handleRecommendationSelect: () => void;
  practiceAssignmentsByOperation: KangurGameOperationSelectorRuntime['practiceAssignmentsByOperation'];
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

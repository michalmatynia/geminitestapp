'use client';

import { useTranslations } from 'next-intl';
import type { useKangurGameRuntime } from '@/features/kangur/ui/context/KangurGameRuntimeContext';
import type { useKangurSubjectFocus } from '@/features/kangur/ui/context/KangurSubjectFocusContext';
import type { getRecommendedTrainingSetup } from '@/features/kangur/ui/services/game-setup-recommendations';
import type {
  KangurLessonComponentId,
  KangurLessonSubject,
} from '@/features/kangur/shared/contracts/kangur';
import type {
  KangurDifficulty,
  KangurGameScreen,
  KangurOperation,
} from '@/features/kangur/ui/types';
import type { KangurAccent } from '@/features/kangur/ui/design/tokens';

export type LessonQuizDefinition = {
  accent: KangurAccent;
  description: string;
  emoji: string;
  label: string;
  lessonComponentIds: readonly KangurLessonComponentId[];
  onSelectScreen: KangurGameScreen;
};

export type LessonQuizOption = LessonQuizDefinition & {
  subject: KangurLessonSubject;
  sortOrder: number;
};

export type OperationSelectorFallbackCopy = {
  operationSelectorTitle: string;
  trainingSetupTitle: string;
  trainingSetupWordmarkLabel: string;
  trainingSetupDescription: string;
  intro: {
    maths: string;
    alphabet: string;
    art: string;
    music: string;
    geometry: string;
    language: string;
  };
  quickPractice: {
    title: string;
    description: string;
    groupAria: (group: string) => string;
    cardAria: (label: string) => string;
    gameChip: string;
  };
  lessonQuizDefinitions: LessonQuizDefinition[];
  recommendation: {
    actions: {
      playAddition: string;
      playSubtraction: string;
      playMultiplication: string;
      playDivision: string;
      playClock: string;
      startMixedTraining: string;
      playFractions: string;
      playPowers: string;
      playRoots: string;
      practiceCalendar: string;
      practiceGeometry: string;
      practiceSubtraction: string;
      practiceDivision: string;
      practiceMultiplication: string;
      startTraining: string;
      playNow: string;
    };
    questLabel: string;
    weakestLesson: {
      description: (masteryPercent: number) => string;
      label: string;
      title: (title: string) => string;
    };
    track: {
      descriptionWithActivity: (track: string, activity: string) => string;
      descriptionDefault: (track: string) => string;
      label: string;
      title: (track: string) => string;
    };
    guided: {
      descriptionWithActivity: (summary: string, activity: string, nextBadgeName: string) => string;
      descriptionDefault: (summary: string, nextBadgeName: string) => string;
      label: string;
      title: (nextBadgeName: string) => string;
    };
    fallback: {
      description: (activity: string, averageXpPerSession: number) => string;
      label: string;
      title: (activity: string) => string;
    };
  };
};

export type KangurOperationSelectorRecommendationTarget =
  | { kind: 'operation'; difficulty: KangurDifficulty; operation: KangurOperation }
  | { kind: 'training' }
  | { kind: 'screen'; screen: KangurGameScreen };

export type KangurOperationSelectorRecommendation = {
  accent: KangurAccent;
  label: string;
  title: string;
  description: string;
  target: KangurOperationSelectorRecommendationTarget;
  actionLabel: string;
  recommendedOperation: KangurOperation | null;
  recommendedScreen: KangurGameScreen | null;
};

export type KangurGameOperationSelectorTranslations = ReturnType<typeof useTranslations>;
export type KangurGameOperationSelectorRuntime = ReturnType<typeof useKangurGameRuntime>;
export type KangurGameOperationSelectorScreen = KangurGameOperationSelectorRuntime['screen'];
export type KangurGameOperationSelectorSubject = ReturnType<typeof useKangurSubjectFocus>['subject'];
export type KangurGameOperationSelectorRecommendationAlias = KangurOperationSelectorRecommendation | null;
export type KangurGameOperationSelectorAssignment = KangurGameOperationSelectorRuntime['activePracticeAssignment'];
export type KangurGameOperationSelectorAssignmentMode = 'active' | 'queue';

export type KangurGameOperationSelectorQuizGroup = {
  label: string;
  options: LessonQuizOption[];
  value: KangurLessonSubject;
};

export type KangurGameOperationRecommendationCardProps = {
  compactActionClassName: string;
  onRecommendationSelect: () => void;
  recommendation: KangurOperationSelectorRecommendation | null;
  showMathSections: boolean;
};

export type KangurGameOperationSelectorQuickPracticeSectionProps = {
  fallbackCopy: OperationSelectorFallbackCopy;
  filteredLessonQuizGroups: KangurGameOperationSelectorQuizGroup[];
  gamePageTranslations: KangurGameOperationSelectorTranslations;
  isSixYearOld: boolean;
  quickPracticeDescription: string;
  quickPracticeGameChipLabel: string;
  quickPracticeTitle: string;
  recommendation: KangurOperationSelectorRecommendation | null;
  recommendedLessonQuizScreen: string | null;
  setScreen: KangurGameOperationSelectorRuntime['setScreen'];
  subject: KangurGameOperationSelectorSubject;
};

export type KangurGameOperationSelectorTrainingSectionProps = {
  basePath: string;
  fallbackCopy: OperationSelectorFallbackCopy;
  gamePageTranslations: KangurGameOperationSelectorTranslations;
  handleHome: KangurGameOperationSelectorRuntime['handleHome'];
  handleStartTraining: KangurGameOperationSelectorRuntime['handleStartTraining'];
  locale: string;
  mixedPracticeAssignment: KangurGameOperationSelectorAssignment;
  normalizedProgress: KangurGameOperationSelectorRuntime['progress'];
  showMathSections: boolean;
  suggestedTraining: ReturnType<typeof getRecommendedTrainingSetup>;
  trainingSectionRef: React.RefObject<HTMLElement | null>;
  trainingSetupTitle: string;
  trainingWordmarkLabel: string;
};

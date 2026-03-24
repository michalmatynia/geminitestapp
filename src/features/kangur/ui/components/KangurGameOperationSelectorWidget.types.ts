import type {
  KangurLessonComponentId,
  KangurLessonSubject,
} from '@/features/kangur/shared/contracts/kangur';
import type {
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
  | { kind: 'operation'; operation: KangurOperation }
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

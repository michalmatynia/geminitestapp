import dynamic from 'next/dynamic';
import type { ComponentType } from 'react';

import type { KangurLaunchableGameScreen } from '@/features/kangur/ui/services/game-launch';

const KangurGameCalendarTrainingWidget = dynamic(
  () =>
    import('@/features/kangur/ui/components/KangurGameCalendarTrainingWidget').then((m) => ({
      default: m.KangurGameCalendarTrainingWidget,
    })),
  { ssr: false }
);
const KangurGameClockQuizWidget = dynamic(
  () =>
    import('@/features/kangur/ui/components/KangurGameClockQuizWidget').then((m) => ({
      default: m.KangurGameClockQuizWidget,
    })),
  { ssr: false }
);
const KangurGameAdditionQuizWidget = dynamic(
  () =>
    import('@/features/kangur/ui/components/KangurGameAdditionQuizWidget').then((m) => ({
      default: m.KangurGameAdditionQuizWidget,
    })),
  { ssr: false }
);
const KangurGameDivisionQuizWidget = dynamic(
  () =>
    import('@/features/kangur/ui/components/KangurGameDivisionQuizWidget').then((m) => ({
      default: m.KangurGameDivisionQuizWidget,
    })),
  { ssr: false }
);
const KangurGameGeometryTrainingWidget = dynamic(
  () =>
    import('@/features/kangur/ui/components/KangurGameGeometryTrainingWidget').then((m) => ({
      default: m.KangurGameGeometryTrainingWidget,
    })),
  { ssr: false }
);
const KangurGameMultiplicationQuizWidget = dynamic(
  () =>
    import('@/features/kangur/ui/components/KangurGameMultiplicationQuizWidget').then((m) => ({
      default: m.KangurGameMultiplicationQuizWidget,
    })),
  { ssr: false }
);
const KangurGameSubtractionQuizWidget = dynamic(
  () =>
    import('@/features/kangur/ui/components/KangurGameSubtractionQuizWidget').then((m) => ({
      default: m.KangurGameSubtractionQuizWidget,
    })),
  { ssr: false }
);
const KangurGameLogicalPatternsQuizWidget = dynamic(
  () =>
    import('@/features/kangur/ui/components/KangurGameLogicalPatternsQuizWidget').then((m) => ({
      default: m.KangurGameLogicalPatternsQuizWidget,
    })),
  { ssr: false }
);
const KangurGameLogicalClassificationQuizWidget = dynamic(
  () =>
    import('@/features/kangur/ui/components/KangurGameLogicalClassificationQuizWidget').then(
      (m) => ({
        default: m.KangurGameLogicalClassificationQuizWidget,
      })
    ),
  { ssr: false }
);
const KangurGameLogicalAnalogiesQuizWidget = dynamic(
  () =>
    import('@/features/kangur/ui/components/KangurGameLogicalAnalogiesQuizWidget').then((m) => ({
      default: m.KangurGameLogicalAnalogiesQuizWidget,
    })),
  { ssr: false }
);
const KangurGameEnglishSentenceQuizWidget = dynamic(
  () =>
    import('@/features/kangur/ui/components/KangurGameEnglishSentenceQuizWidget').then((m) => ({
      default: m.KangurGameEnglishSentenceQuizWidget,
    })),
  { ssr: false }
);
const KangurGameEnglishPartsOfSpeechQuizWidget = dynamic(
  () =>
    import('@/features/kangur/ui/components/KangurGameEnglishPartsOfSpeechQuizWidget').then(
      (m) => ({
        default: m.KangurGameEnglishPartsOfSpeechQuizWidget,
      })
    ),
  { ssr: false }
);

export type KangurLaunchableGameScreenComponentConfig = {
  className: string;
  Component: ComponentType;
};

export const KANGUR_LAUNCHABLE_GAME_SCREEN_COMPONENTS: Record<
  KangurLaunchableGameScreen,
  KangurLaunchableGameScreenComponentConfig
> = {
  calendar_quiz: {
    className: 'w-full flex flex-col items-center',
    Component: KangurGameCalendarTrainingWidget,
  },
  geometry_quiz: {
    className: 'w-full flex flex-col items-center',
    Component: KangurGameGeometryTrainingWidget,
  },
  clock_quiz: {
    className: 'w-full flex flex-col items-center',
    Component: KangurGameClockQuizWidget,
  },
  addition_quiz: {
    className: 'w-full flex flex-col items-center',
    Component: KangurGameAdditionQuizWidget,
  },
  subtraction_quiz: {
    className: 'w-full flex flex-col items-center',
    Component: KangurGameSubtractionQuizWidget,
  },
  multiplication_quiz: {
    className: 'w-full flex flex-col items-center',
    Component: KangurGameMultiplicationQuizWidget,
  },
  division_quiz: {
    className: 'w-full flex flex-col items-center',
    Component: KangurGameDivisionQuizWidget,
  },
  logical_patterns_quiz: {
    className: 'w-full flex flex-col items-center',
    Component: KangurGameLogicalPatternsQuizWidget,
  },
  logical_classification_quiz: {
    className: 'w-full flex flex-col items-center',
    Component: KangurGameLogicalClassificationQuizWidget,
  },
  logical_analogies_quiz: {
    className: 'w-full flex flex-col items-center',
    Component: KangurGameLogicalAnalogiesQuizWidget,
  },
  english_sentence_quiz: {
    className: 'w-full flex flex-col items-center',
    Component: KangurGameEnglishSentenceQuizWidget,
  },
  english_parts_of_speech_quiz: {
    className: 'w-full flex flex-col items-center',
    Component: KangurGameEnglishPartsOfSpeechQuizWidget,
  },
};

export const getKangurLaunchableGameScreenComponentConfig = (
  screenKey: KangurLaunchableGameScreen
): KangurLaunchableGameScreenComponentConfig => {
  const config = KANGUR_LAUNCHABLE_GAME_SCREEN_COMPONENTS[screenKey];

  if (!config) {
    throw new Error(`Missing launchable game screen config for "${screenKey}".`);
  }

  return config;
};

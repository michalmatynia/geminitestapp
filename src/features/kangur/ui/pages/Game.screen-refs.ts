'use client';

import { useMemo, useRef, type RefObject } from 'react';

import {
  getKangurGameDefinition,
  resolveKangurLaunchableGameRuntimeForPersistedInstance,
} from '@/features/kangur/games';
import { useKangurGameContentSets } from '@/features/kangur/ui/hooks/useKangurGameContentSets';
import { useKangurGameInstances } from '@/features/kangur/ui/hooks/useKangurGameInstances';
import { useKangurMusicPianoRollLaunchableScreenRefs } from '@/features/kangur/ui/pages/music-piano-roll-launchable-screen-refs';
import {
  KANGUR_LAUNCHABLE_GAME_SCREENS,
  isKangurLaunchableGameScreen,
  type KangurLaunchableGameScreen,
} from '@/features/kangur/ui/services/game-launch';
import type { KangurGameScreen } from '@/features/kangur/ui/types';

import { getKangurLaunchableGameScreenComponentConfig } from './Game.launchable-screens';

export type GameLaunchableRuntime =
  ReturnType<typeof getKangurLaunchableGameScreenComponentConfig>['runtime'];

export type GameLaunchableScreenRefs = Record<
  KangurLaunchableGameScreen,
  RefObject<HTMLDivElement | null>
>;

export type GameHomeScreenRefs = {
  homeActionsRef: RefObject<HTMLDivElement | null>;
  homeAssignmentsRef: RefObject<HTMLElement | null>;
  homeLeaderboardRef: RefObject<HTMLDivElement | null>;
  homeProgressRef: RefObject<HTMLDivElement | null>;
  homeQuestRef: RefObject<HTMLElement | null>;
};

export type GameSessionScreenRefs = {
  kangurSessionRef: RefObject<HTMLDivElement | null>;
  kangurSetupRef: RefObject<HTMLDivElement | null>;
  launchableGameScreenRefs: GameLaunchableScreenRefs;
  operationSelectorRef: RefObject<HTMLDivElement | null>;
  resultLeaderboardRef: RefObject<HTMLDivElement | null>;
  resultSummaryRef: RefObject<HTMLDivElement | null>;
  trainingSetupRef: RefObject<HTMLDivElement | null>;
};

export type GameScreenRefsState = {
  homeRefs: GameHomeScreenRefs;
  screenHeadingRef: RefObject<HTMLHeadingElement | null>;
  sessionRefs: GameSessionScreenRefs;
};

export function useGameScreenRefs(): GameScreenRefsState {
  const screenHeadingRef = useRef<HTMLHeadingElement>(null);
  const homeActionsRef = useRef<HTMLDivElement | null>(null);
  const homeQuestRef = useRef<HTMLElement | null>(null);
  const homeAssignmentsRef = useRef<HTMLElement | null>(null);
  const homeLeaderboardRef = useRef<HTMLDivElement | null>(null);
  const homeProgressRef = useRef<HTMLDivElement | null>(null);
  const trainingSetupRef = useRef<HTMLDivElement | null>(null);
  const kangurSetupRef = useRef<HTMLDivElement | null>(null);
  const kangurSessionRef = useRef<HTMLDivElement | null>(null);
  const agenticApprovalGateQuizRef = useRef<HTMLDivElement | null>(null);
  const agenticPromptTrimQuizRef = useRef<HTMLDivElement | null>(null);
  const agenticReasoningRouterQuizRef = useRef<HTMLDivElement | null>(null);
  const agenticSurfaceMatchQuizRef = useRef<HTMLDivElement | null>(null);
  const alphabetFirstWordsQuizRef = useRef<HTMLDivElement | null>(null);
  const alphabetLetterMatchingQuizRef = useRef<HTMLDivElement | null>(null);
  const alphabetLetterOrderQuizRef = useRef<HTMLDivElement | null>(null);
  const artColorHarmonyQuizRef = useRef<HTMLDivElement | null>(null);
  const artShapeRotationQuizRef = useRef<HTMLDivElement | null>(null);
  const calendarQuizRef = useRef<HTMLDivElement | null>(null);
  const geometryQuizRef = useRef<HTMLDivElement | null>(null);
  const geometryShapeSpotterQuizRef = useRef<HTMLDivElement | null>(null);
  const clockQuizRef = useRef<HTMLDivElement | null>(null);
  const musicLaunchableGameScreenRefs = useKangurMusicPianoRollLaunchableScreenRefs();
  const additionQuizRef = useRef<HTMLDivElement | null>(null);
  const addingSynthesisQuizRef = useRef<HTMLDivElement | null>(null);
  const subtractionQuizRef = useRef<HTMLDivElement | null>(null);
  const divisionQuizRef = useRef<HTMLDivElement | null>(null);
  const multiplicationQuizRef = useRef<HTMLDivElement | null>(null);
  const logicalPatternsQuizRef = useRef<HTMLDivElement | null>(null);
  const logicalClassificationQuizRef = useRef<HTMLDivElement | null>(null);
  const logicalAnalogiesQuizRef = useRef<HTMLDivElement | null>(null);
  const englishSubjectVerbAgreementQuizRef = useRef<HTMLDivElement | null>(null);
  const englishAdjectivesQuizRef = useRef<HTMLDivElement | null>(null);
  const englishCompareAndCrownQuizRef = useRef<HTMLDivElement | null>(null);
  const englishAdverbsQuizRef = useRef<HTMLDivElement | null>(null);
  const englishAdverbsFrequencyQuizRef = useRef<HTMLDivElement | null>(null);
  const englishArticlesQuizRef = useRef<HTMLDivElement | null>(null);
  const englishPrepositionsQuizRef = useRef<HTMLDivElement | null>(null);
  const englishPrepositionsSortQuizRef = useRef<HTMLDivElement | null>(null);
  const englishPrepositionsOrderQuizRef = useRef<HTMLDivElement | null>(null);
  const englishPronounsWarmupQuizRef = useRef<HTMLDivElement | null>(null);
  const englishSentenceQuizRef = useRef<HTMLDivElement | null>(null);
  const englishPartsOfSpeechQuizRef = useRef<HTMLDivElement | null>(null);
  const operationSelectorRef = useRef<HTMLDivElement | null>(null);
  const resultSummaryRef = useRef<HTMLDivElement | null>(null);
  const resultLeaderboardRef = useRef<HTMLDivElement | null>(null);
  const launchableGameScreenRefs: GameLaunchableScreenRefs = {
    agentic_approval_gate_quiz: agenticApprovalGateQuizRef,
    agentic_prompt_trim_quiz: agenticPromptTrimQuizRef,
    agentic_reasoning_router_quiz: agenticReasoningRouterQuizRef,
    agentic_surface_match_quiz: agenticSurfaceMatchQuizRef,
    alphabet_first_words_quiz: alphabetFirstWordsQuizRef,
    alphabet_letter_matching_quiz: alphabetLetterMatchingQuizRef,
    alphabet_letter_order_quiz: alphabetLetterOrderQuizRef,
    art_color_harmony_quiz: artColorHarmonyQuizRef,
    art_shape_rotation_quiz: artShapeRotationQuizRef,
    calendar_quiz: calendarQuizRef,
    geometry_quiz: geometryQuizRef,
    geometry_shape_spotter_quiz: geometryShapeSpotterQuizRef,
    clock_quiz: clockQuizRef,
    ...musicLaunchableGameScreenRefs,
    addition_quiz: additionQuizRef,
    adding_synthesis_quiz: addingSynthesisQuizRef,
    subtraction_quiz: subtractionQuizRef,
    multiplication_quiz: multiplicationQuizRef,
    division_quiz: divisionQuizRef,
    logical_patterns_quiz: logicalPatternsQuizRef,
    logical_classification_quiz: logicalClassificationQuizRef,
    logical_analogies_quiz: logicalAnalogiesQuizRef,
    english_subject_verb_agreement_quiz: englishSubjectVerbAgreementQuizRef,
    english_going_to_quiz: englishSentenceQuizRef,
    english_adjectives_quiz: englishAdjectivesQuizRef,
    english_compare_and_crown_quiz: englishCompareAndCrownQuizRef,
    english_adverbs_quiz: englishAdverbsQuizRef,
    english_adverbs_frequency_quiz: englishAdverbsFrequencyQuizRef,
    english_articles_quiz: englishArticlesQuizRef,
    english_prepositions_quiz: englishPrepositionsQuizRef,
    english_prepositions_sort_quiz: englishPrepositionsSortQuizRef,
    english_prepositions_order_quiz: englishPrepositionsOrderQuizRef,
    english_pronouns_warmup_quiz: englishPronounsWarmupQuizRef,
    english_sentence_quiz: englishSentenceQuizRef,
    english_parts_of_speech_quiz: englishPartsOfSpeechQuizRef,
  };

  return {
    homeRefs: {
      homeActionsRef,
      homeAssignmentsRef,
      homeLeaderboardRef,
      homeProgressRef,
      homeQuestRef,
    },
    screenHeadingRef,
    sessionRefs: {
      kangurSessionRef,
      kangurSetupRef,
      launchableGameScreenRefs,
      operationSelectorRef,
      resultLeaderboardRef,
      resultSummaryRef,
      trainingSetupRef,
    },
  };
}

const resolveLaunchableGameInstanceQueryEnabled = ({
  launchableGameInstanceId,
  screen,
}: {
  launchableGameInstanceId?: string | null;
  screen: KangurGameScreen;
}): boolean => isKangurLaunchableGameScreen(screen) && Boolean(launchableGameInstanceId);

const resolveLaunchableGameContentSetsQueryEnabled = ({
  contentSetId,
  screen,
}: {
  contentSetId?: string | null;
  screen: KangurGameScreen;
}): boolean => isKangurLaunchableGameScreen(screen) && Boolean(contentSetId);

const resolveLaunchableGameRuntimeLoading = ({
  activeLaunchableGameInstance,
  launchableGameContentSetsPending,
  launchableGameInstanceId,
  launchableGameInstancePending,
  screen,
}: {
  activeLaunchableGameInstance: { contentSetId?: string | null } | null;
  launchableGameContentSetsPending: boolean;
  launchableGameInstanceId?: string | null;
  launchableGameInstancePending: boolean;
  screen: KangurGameScreen;
}): boolean =>
  isKangurLaunchableGameScreen(screen) &&
  Boolean(launchableGameInstanceId) &&
  (launchableGameInstancePending ||
    (Boolean(activeLaunchableGameInstance?.contentSetId) && launchableGameContentSetsPending));

const resolveActiveLaunchableGameRuntime = ({
  activeLaunchableGameInstance,
  contentSets,
  launchableGameInstanceId,
  screen,
}: {
  activeLaunchableGameInstance: {
    contentSetId?: string | null;
    gameId: string;
    launchableRuntimeId?: string | null;
  } | null;
  contentSets: unknown;
  launchableGameInstanceId?: string | null;
  screen: KangurGameScreen;
}): GameLaunchableRuntime | null => {
  if (!isKangurLaunchableGameScreen(screen)) {
    return null;
  }

  const defaultRuntime = getKangurLaunchableGameScreenComponentConfig(screen).runtime;
  if (!launchableGameInstanceId) {
    return defaultRuntime;
  }

  if (!activeLaunchableGameInstance) {
    return null;
  }

  if (activeLaunchableGameInstance.launchableRuntimeId !== screen) {
    return null;
  }

  const game = getKangurGameDefinition(activeLaunchableGameInstance.gameId);
  return resolveKangurLaunchableGameRuntimeForPersistedInstance(
    game,
    activeLaunchableGameInstance,
    contentSets
  );
};

export function useGameLaunchableRuntime(input: {
  launchableGameInstanceId?: string | null;
  screen: KangurGameScreen;
}): {
  activeLaunchableGameRuntime: GameLaunchableRuntime | null;
  launchableGameRuntimeLoading: boolean;
} {
  const { launchableGameInstanceId, screen } = input;
  const launchableGameInstanceQuery = useKangurGameInstances({
    enabled: resolveLaunchableGameInstanceQueryEnabled({
      launchableGameInstanceId,
      screen,
    }),
    enabledOnly: true,
    instanceId: launchableGameInstanceId ?? undefined,
  });
  const activeLaunchableGameInstance = launchableGameInstanceQuery.data?.[0] ?? null;
  const launchableGameContentSetsQuery = useKangurGameContentSets({
    contentSetId: activeLaunchableGameInstance?.contentSetId ?? undefined,
    enabled: resolveLaunchableGameContentSetsQueryEnabled({
      contentSetId: activeLaunchableGameInstance?.contentSetId,
      screen,
    }),
    gameId: activeLaunchableGameInstance?.gameId,
  });
  const activeLaunchableGameRuntime = useMemo(
    () =>
      resolveActiveLaunchableGameRuntime({
        activeLaunchableGameInstance,
        contentSets: launchableGameContentSetsQuery.data,
        launchableGameInstanceId,
        screen,
      }),
    [
      activeLaunchableGameInstance,
      launchableGameContentSetsQuery.data,
      launchableGameInstanceId,
      screen,
    ]
  );

  return {
    activeLaunchableGameRuntime,
    launchableGameRuntimeLoading: resolveLaunchableGameRuntimeLoading({
      activeLaunchableGameInstance,
      launchableGameContentSetsPending: launchableGameContentSetsQuery.isPending,
      launchableGameInstanceId,
      launchableGameInstancePending: launchableGameInstanceQuery.isPending,
      screen,
    }),
  };
}

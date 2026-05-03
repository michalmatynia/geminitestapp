'use client';

import type { useTranslations } from 'next-intl';
import { useMemo, type RefObject } from 'react';

import { useKangurTutorAnchors, type KangurTutorAnchorConfig } from '@/features/kangur/ui/hooks/useKangurTutorAnchors';
import type { KangurGameScreen } from '@/features/kangur/ui/types';

import type {
  GameHomeScreenRefs,
  GameSessionScreenRefs,
} from './Game.screen-refs';

type GameTranslations = ReturnType<typeof useTranslations>;
type GameTutorAnchorRefs = Partial<GameHomeScreenRefs> & GameSessionScreenRefs;

const getGameScreenLabel = (
  translations: GameTranslations,
  screenKey: KangurGameScreen
): string => translations(`screens.${screenKey}.label`);

const createGameTutorAnchor = (
  anchor: Omit<KangurTutorAnchorConfig, 'surface'>
): KangurTutorAnchorConfig => ({
  ...anchor,
  surface: 'game',
});

const createGameScreenTutorAnchor = ({
  contentId,
  enabled,
  id,
  label,
  priority,
  ref,
}: {
  contentId: string;
  enabled: boolean;
  id: string;
  label: string;
  priority: number;
  ref: RefObject<HTMLDivElement | null>;
}): KangurTutorAnchorConfig =>
  createGameTutorAnchor({
    contentId: enabled ? contentId : null,
    enabled,
    id,
    kind: 'screen',
    label,
    priority,
    ref,
  });

const buildGameHomeTutorAnchors = ({
  canAccessParentAssignments,
  refs,
  screen,
  translations,
}: {
  canAccessParentAssignments: boolean;
  refs: GameHomeScreenRefs & GameSessionScreenRefs;
  screen: KangurGameScreen;
  translations: GameTranslations;
}): KangurTutorAnchorConfig[] => [
  createGameTutorAnchor({
    contentId: 'game:home',
    enabled: screen === 'home',
    id: 'kangur-game-home-actions',
    kind: 'home_actions',
    label: translations('home.actionsLabel'),
    priority: 120,
    ref: refs.homeActionsRef,
  }),
  createGameTutorAnchor({
    contentId: 'game:home',
    enabled: screen === 'home',
    id: 'kangur-game-home-quest',
    kind: 'home_quest',
    label: translations('home.questHeading'),
    priority: 110,
    ref: refs.homeQuestRef,
  }),
  createGameTutorAnchor({
    contentId: 'game:home',
    enabled: screen === 'home' && canAccessParentAssignments,
    id: 'kangur-game-home-assignments',
    kind: 'priority_assignments',
    label: translations('home.priorityAssignmentsHeading'),
    priority: 100,
    ref: refs.homeAssignmentsRef,
  }),
  createGameTutorAnchor({
    contentId: 'game:home',
    enabled: screen === 'home',
    id: 'kangur-game-home-leaderboard',
    kind: 'leaderboard',
    label: translations('home.leaderboardLabel'),
    priority: 90,
    ref: refs.homeLeaderboardRef,
  }),
  createGameTutorAnchor({
    contentId: 'game:home',
    enabled: screen === 'home',
    id: 'kangur-game-home-progress',
    kind: 'progress',
    label: translations('home.progressLabel'),
    priority: 80,
    ref: refs.homeProgressRef,
  }),
];

export default function GameDeferredTutorAnchors(input: {
  activeGameAssignmentId?: string | null;
  canAccessParentAssignments: boolean;
  enabled?: boolean;
  refs: GameTutorAnchorRefs;
  screen: KangurGameScreen;
  translations: GameTranslations;
  tutorActivityContentId: string;
}): null {
  const {
    activeGameAssignmentId,
    canAccessParentAssignments,
    enabled = true,
    refs,
    screen,
    translations,
    tutorActivityContentId,
  } = input;

  const tutorAnchors = useMemo(
    () =>
      !enabled
        ? []
        : [
            ...(screen === 'home'
              ? buildGameHomeTutorAnchors({
                  canAccessParentAssignments,
                  refs: refs as GameHomeScreenRefs & GameSessionScreenRefs,
                  screen,
                  translations,
                })
              : []),
            createGameScreenTutorAnchor({
              contentId: tutorActivityContentId,
              enabled: screen === 'training',
              id: 'kangur-game-training-setup',
              label: getGameScreenLabel(translations, 'training'),
              priority: 120,
              ref: refs.trainingSetupRef,
            }),
            createGameScreenTutorAnchor({
              contentId: tutorActivityContentId,
              enabled: screen === 'kangur_setup',
              id: 'kangur-game-kangur-setup',
              label: getGameScreenLabel(translations, 'kangur_setup'),
              priority: 120,
              ref: refs.kangurSetupRef,
            }),
            createGameScreenTutorAnchor({
              contentId: tutorActivityContentId,
              enabled: screen === 'kangur',
              id: 'kangur-game-kangur-session',
              label: getGameScreenLabel(translations, 'kangur'),
              priority: 120,
              ref: refs.kangurSessionRef,
            }),
            createGameScreenTutorAnchor({
              contentId: tutorActivityContentId,
              enabled: screen === 'operation',
              id: 'kangur-game-operation-selector',
              label: getGameScreenLabel(translations, 'operation'),
              priority: 120,
              ref: refs.operationSelectorRef,
            }),
            createGameTutorAnchor({
              assignmentId: activeGameAssignmentId ?? null,
              contentId: screen === 'result' ? tutorActivityContentId : null,
              enabled: screen === 'result',
              id: 'kangur-game-result-summary',
              kind: 'review',
              label: getGameScreenLabel(translations, 'result'),
              priority: 110,
              ref: refs.resultSummaryRef,
            }),
            createGameTutorAnchor({
              contentId: screen === 'result' ? tutorActivityContentId : null,
              enabled: screen === 'result',
              id: 'kangur-game-result-leaderboard',
              kind: 'leaderboard',
              label: translations('result.leaderboardLabel'),
              priority: 100,
              ref: refs.resultLeaderboardRef,
            }),
          ],
    [
      activeGameAssignmentId,
      canAccessParentAssignments,
      enabled,
      refs,
      screen,
      translations,
      tutorActivityContentId,
    ]
  );

  useKangurTutorAnchors(tutorAnchors);
  return null;
}

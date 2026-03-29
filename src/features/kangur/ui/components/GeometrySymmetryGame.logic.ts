import type { Dispatch, RefObject, SetStateAction } from 'react';

import {
  getKangurMiniGameFinishLabel,
  translateKangurMiniGameWithFallback,
  type KangurMiniGameTranslate,
} from '@/features/kangur/ui/constants/mini-game-i18n';
import { getGeometrySymmetryMiniGameFallbackCopy } from '@/features/kangur/ui/components/geometry-mini-game-fallbacks';
import {
  evaluateAxisDrawing,
  evaluateMirrorDrawing,
} from '@/features/kangur/ui/services/geometry-symmetry';
import {
  addXp,
  createTrainingReward,
  loadProgress,
} from '@/features/kangur/ui/services/progress';
import { persistKangurSessionScore } from '@/features/kangur/ui/services/session-score';
import type {
  KangurMiniGameFinishActionProps,
  KangurMiniGameInformationalFeedback,
  KangurRewardBreakdownEntry,
} from '@/features/kangur/ui/types';
import { BASE_MIN_DRAWING_POINTS, flattenPaths } from './GeometrySymmetryGame.data';
import {
  computeShapeBounds,
  drawAxis,
  drawAxisCorridor,
  drawGhostShape,
  drawGrid,
  drawShape,
  drawTargetZone,
} from './GeometrySymmetryGame.canvas';
import type { SymmetryRound } from './GeometrySymmetryGame.types';

export type GeometrySymmetryTranslations = KangurMiniGameTranslate;
export type GeometrySymmetryFallbackCopy = ReturnType<typeof getGeometrySymmetryMiniGameFallbackCopy>;
export type GeometrySymmetryTranslateWithFallback = ReturnType<
  typeof resolveGeometrySymmetryTranslateWithFallback
>;

const localizeSymmetryRound = (
  translate: GeometrySymmetryTranslations,
  round: SymmetryRound,
  fallbackRound: Pick<SymmetryRound, 'hint' | 'prompt' | 'title'>
): SymmetryRound => ({
  ...round,
  title: translateKangurMiniGameWithFallback(
    translate,
    `geometrySymmetry.inRound.rounds.${round.id}.title`,
    fallbackRound.title
  ),
  prompt: translateKangurMiniGameWithFallback(
    translate,
    `geometrySymmetry.inRound.rounds.${round.id}.prompt`,
    fallbackRound.prompt
  ),
  hint: translateKangurMiniGameWithFallback(
    translate,
    `geometrySymmetry.inRound.rounds.${round.id}.hint`,
    fallbackRound.hint
  ),
});

export const resolveGeometrySymmetryTranslateWithFallback = ({
  translations,
}: {
  translations: GeometrySymmetryTranslations;
}) => (key: string, fallback: string, values?: Record<string, string | number>): string =>
  translateKangurMiniGameWithFallback(translations, key, fallback, values);

export const resolveGeometrySymmetryRounds = ({
  fallbackCopy,
  rounds,
  translations,
}: {
  fallbackCopy: GeometrySymmetryFallbackCopy;
  rounds: readonly SymmetryRound[];
  translations: GeometrySymmetryTranslations;
}): SymmetryRound[] =>
  rounds.map((round) =>
    localizeSymmetryRound(translations, round, fallbackCopy.rounds[round.id] ?? round)
  );

export const resolveGeometrySymmetryFallbackCopy = (locale: string): GeometrySymmetryFallbackCopy =>
  getGeometrySymmetryMiniGameFallbackCopy(locale);

export const resolveGeometrySymmetryBoardAccent = (
  feedback: KangurMiniGameInformationalFeedback | null
): 'amber' | 'emerald' | 'rose' =>
  feedback?.kind === 'success'
    ? 'emerald'
    : feedback?.kind === 'error'
      ? 'rose'
      : feedback?.kind === 'info'
        ? 'amber'
        : 'emerald';

export const resolveGeometrySymmetryResultLocked = (
  feedback: KangurMiniGameInformationalFeedback | null
): boolean => feedback?.kind === 'success' || feedback?.kind === 'error';

export const resolveGeometrySymmetrySummaryPercent = (score: number, totalRounds: number): number =>
  Math.round((score / totalRounds) * 100);

export const resolveGeometrySymmetrySummaryEmoji = (
  score: number,
  totalRounds: number
): string => (score === totalRounds ? '🏆' : score >= Math.ceil(totalRounds / 2) ? '🌟' : '💪');

export const resolveGeometrySymmetrySummaryMessage = ({
  score,
  totalRounds,
  translations,
}: {
  score: number;
  totalRounds: number;
  translations: GeometrySymmetryTranslations;
}): string =>
  score === totalRounds
    ? translations('geometrySymmetry.summary.perfect')
    : score >= Math.ceil(totalRounds / 2)
      ? translations('geometrySymmetry.summary.good')
      : translations('geometrySymmetry.summary.retry');

export const drawGeometrySymmetryRoundBackground = ({
  ctx,
  currentRound,
  showMirrorHint,
}: {
  ctx: CanvasRenderingContext2D;
  currentRound: SymmetryRound | undefined;
  showMirrorHint: boolean;
}): void => {
  drawGrid(ctx);

  if (!currentRound) {
    return;
  }

  if (currentRound.type === 'mirror' && currentRound.expectedSide) {
    drawTargetZone(ctx, currentRound.axis, currentRound.expectedSide, {
      shadeOpposite: true,
    });
    if (showMirrorHint) {
      drawGhostShape(ctx, currentRound.template, currentRound.axis);
    }
    drawAxis(ctx, currentRound.axis);
    drawShape(ctx, currentRound.template, '#6ee7b7', 4);
    return;
  }

  drawAxisCorridor(ctx, currentRound.axis, computeShapeBounds(currentRound.template));
  drawShape(ctx, currentRound.template, '#a7f3d0', 4);
};

export const clearGeometrySymmetryInfoFeedback = ({
  feedback,
  setFeedback,
}: {
  feedback: KangurMiniGameInformationalFeedback | null;
  setFeedback: Dispatch<SetStateAction<KangurMiniGameInformationalFeedback | null>>;
}): void => {
  if (feedback?.kind === 'info') {
    setFeedback(null);
  }
};

export const resolveGeometrySymmetryMinimumDrawingPoints = (
  isCoarsePointer: boolean
): number =>
  isCoarsePointer
    ? Math.max(6, Math.round(BASE_MIN_DRAWING_POINTS * 0.7))
    : BASE_MIN_DRAWING_POINTS;

export const resolveGeometrySymmetryCheckResult = ({
  currentRound,
  fallbackCopy,
  locale,
  minDrawingPoints,
  points,
  translateWithFallback,
  translations,
}: {
  currentRound: SymmetryRound | undefined;
  fallbackCopy: GeometrySymmetryFallbackCopy;
  locale: string;
  minDrawingPoints: number;
  points: Array<{ x: number; y: number }>;
  translateWithFallback: GeometrySymmetryTranslateWithFallback;
  translations: GeometrySymmetryTranslations;
}):
  | {
      accepted: boolean;
      feedback: KangurMiniGameInformationalFeedback;
    }
  | null => {
  if (!currentRound) {
    return null;
  }

  if (points.length < minDrawingPoints) {
    return {
      accepted: false,
      feedback: {
        kind: 'info',
        text: translateWithFallback(
          'geometrySymmetry.inRound.tooShort',
          fallbackCopy.tooShort
        ),
      },
    };
  }

  if (currentRound.type === 'axis') {
    const result = evaluateAxisDrawing(points, currentRound.axis, {
      locale,
      translate: translations,
    });
    return {
      accepted: result.accepted,
      feedback: {
        kind: result.kind,
        text: result.message,
      },
    };
  }

  const result = evaluateMirrorDrawing({
    points,
    template: flattenPaths(currentRound.template),
    axis: currentRound.axis,
    expectedSide: currentRound.expectedSide ?? 'right',
    locale,
    translate: translations,
  });
  return {
    accepted: result.accepted,
    feedback: {
      kind: result.kind,
      text: result.message,
    },
  };
};

export const persistGeometrySymmetryCompletion = ({
  nextScore,
  ownerKey,
  sessionStartedAtRef,
  setDone,
  setXpBreakdown,
  setXpEarned,
  totalRounds,
}: {
  nextScore: number;
  ownerKey: string;
  sessionStartedAtRef: RefObject<number>;
  setDone: Dispatch<SetStateAction<boolean>>;
  setXpBreakdown: Dispatch<SetStateAction<KangurRewardBreakdownEntry[]>>;
  setXpEarned: Dispatch<SetStateAction<number>>;
  totalRounds: number;
}): void => {
  const progress = loadProgress({ ownerKey });
  const reward = createTrainingReward(progress, {
    activityKey: 'training:geometry_symmetry',
    lessonKey: 'geometry_symmetry',
    correctAnswers: nextScore,
    totalQuestions: totalRounds,
    strongThresholdPercent: 65,
    perfectCounterKey: 'geometryPerfect',
  });
  addXp(reward.xp, reward.progressUpdates, { ownerKey });
  void persistKangurSessionScore({
    operation: 'geometry_symmetry',
    score: nextScore,
    totalQuestions: totalRounds,
    correctAnswers: nextScore,
    timeTakenSeconds: Math.round((Date.now() - sessionStartedAtRef.current) / 1000),
    xpEarned: reward.xp,
  });
  setXpEarned(reward.xp);
  setXpBreakdown(reward.breakdown ?? []);
  setDone(true);
};

export const resolveGeometrySymmetryFinishLabel = (
  translations: GeometrySymmetryTranslations
): string => getKangurMiniGameFinishLabel(translations, 'back');

export type GeometrySymmetryFinishProps = KangurMiniGameFinishActionProps;

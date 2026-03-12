import {
  appendKangurUrlParams,
  getKangurPageHref as createPageUrl,
} from '@/features/kangur/config/routing';
import { KANGUR_LESSON_LIBRARY } from '@/features/kangur/settings';
import KangurRecommendationCard from '@/features/kangur/ui/components/KangurRecommendationCard';
import { KangurTransitionLink as Link } from '@/features/kangur/ui/components/KangurTransitionLink';
import { KangurButton } from '@/features/kangur/ui/design/primitives';
import {
  getProgressAverageAccuracy,
  getProgressBadgeTrackSummaries,
  getProgressTopActivities,
  getRecommendedSessionMomentum,
} from '@/features/kangur/ui/services/progress';
import type { KangurProgressState } from '@/features/kangur/ui/types';
import type { KangurLessonComponentId, KangurRouteAction } from '@/shared/contracts/kangur';

type KangurGameHomeMomentumWidgetProps = {
  basePath: string;
  progress: KangurProgressState;
};

type KangurHomeRecommendation = {
  action: KangurRouteAction;
  accent: 'indigo' | 'violet' | 'amber' | 'rose';
  description: string;
  priorityLabel: string;
  title: string;
};

const QUICK_START_OPERATIONS = new Set([
  'addition',
  'subtraction',
  'multiplication',
  'division',
  'decimals',
  'powers',
  'roots',
  'clock',
  'mixed',
]);

const resolvePracticeDifficulty = (averageAccuracy: number): 'easy' | 'medium' | 'hard' => {
  if (averageAccuracy >= 85) {
    return 'hard';
  }
  if (averageAccuracy >= 70) {
    return 'medium';
  }
  return 'easy';
};

const buildAssignmentHref = (basePath: string, action: KangurRouteAction): string => {
  const href = createPageUrl(action.page, basePath);
  return action.query ? appendKangurUrlParams(href, action.query, basePath) : href;
};

const buildPracticeRecommendationAction = (
  operation: string | null,
  averageAccuracy: number
): KangurRouteAction => {
  if (!operation || !QUICK_START_OPERATIONS.has(operation)) {
    return {
      label: 'Uruchom trening',
      page: 'Game',
      query: {
        quickStart: 'training',
      },
    };
  }

  return {
    label: 'Uruchom trening',
    page: 'Game',
    query: {
      quickStart: 'operation',
      operation,
      difficulty: resolvePracticeDifficulty(averageAccuracy),
    },
  };
};

const resolveActivityOperation = (activityKey: string): string | null => {
  const [kind = '', primary = ''] = activityKey.split(':');
  const normalizedPrimary = primary.trim();

  if (!normalizedPrimary) {
    return null;
  }

  if (
    kind === 'game' ||
    kind === 'lesson_practice' ||
    kind === 'training' ||
    kind === 'lesson_completion'
  ) {
    return normalizedPrimary;
  }

  return null;
};

const getWeakestLessonRecommendation = (
  progress: KangurProgressState
): KangurHomeRecommendation | null => {
  const weakestLesson = Object.entries(progress.lessonMastery)
    .filter(([, entry]) => entry.attempts > 0 && entry.masteryPercent < 80)
    .sort((left, right) => left[1].masteryPercent - right[1].masteryPercent)[0];

  if (!weakestLesson) {
    return null;
  }

  const [componentId, entry] = weakestLesson;
  const lesson = KANGUR_LESSON_LIBRARY[componentId as KangurLessonComponentId];
  if (!lesson) {
    return null;
  }

  return {
    accent: entry.masteryPercent < 60 ? 'rose' : 'amber',
    action: {
      label: 'Otwórz lekcję',
      page: 'Lessons',
      query: {
        focus: componentId,
      },
    },
    description: `Opanowanie ${entry.masteryPercent}%. Jedna krótka powtórka tej lekcji szybciej domknie kolejny próg mistrzostwa.`,
    priorityLabel: entry.masteryPercent < 60 ? 'Priorytet wysoki' : 'Priorytet średni',
    title: `Dziś warto: ${lesson.title}`,
  };
};

const getStreakRecommendation = (
  progress: KangurProgressState
): KangurHomeRecommendation | null => {
  const gamesPlayed = progress.gamesPlayed ?? 0;
  const currentWinStreak = progress.currentWinStreak ?? 0;

  if (gamesPlayed <= 0 || currentWinStreak >= 2) {
    return null;
  }

  return {
    accent: 'violet',
    action: {
      label: 'Zagraj teraz',
      page: 'Game',
      query: {
        quickStart: 'training',
      },
    },
    description:
      currentWinStreak <= 0
        ? 'Jedna krótka gra dzisiaj uruchomi nową serię i pomoże podtrzymać rytm nauki.'
        : `Masz serię ${currentWinStreak}. Jeszcze jedna mocna runda dzisiaj ją rozpędzi.`,
    priorityLabel: 'Priorytet średni',
    title: currentWinStreak <= 0 ? 'Zbuduj serię na nowo' : 'Rozpędź aktualną serię',
  };
};

const getGuidedRecommendation = (
  progress: KangurProgressState
): KangurHomeRecommendation | null => {
  const guidedMomentum = getRecommendedSessionMomentum(progress);
  if (guidedMomentum.completedSessions <= 0 || !guidedMomentum.nextBadgeName) {
    return null;
  }

  const topActivity = getProgressTopActivities(progress, 1)[0] ?? null;
  const action = buildPracticeRecommendationAction(
    resolveActivityOperation(topActivity?.key ?? ''),
    topActivity?.averageAccuracy ?? getProgressAverageAccuracy(progress)
  );

  return {
    accent: 'indigo',
    action,
    description: topActivity
      ? `Masz już ${guidedMomentum.summary} w poleconym rytmie. Jeszcze jedna mocna runda ${topActivity.label.toLowerCase()} przybliża odznakę ${guidedMomentum.nextBadgeName}.`
      : `Masz już ${guidedMomentum.summary} w poleconym rytmie. Jeszcze jedna mocna runda przybliża odznakę ${guidedMomentum.nextBadgeName}.`,
    priorityLabel: 'Polecony kierunek',
    title: `Dopnij: ${guidedMomentum.nextBadgeName}`,
  };
};

const getTrackRecommendation = (
  progress: KangurProgressState
): KangurHomeRecommendation | null => {
  const track =
    getProgressBadgeTrackSummaries(progress, { maxTracks: 6 }).find(
      (entry) =>
        Boolean(entry.nextBadge) && (entry.unlockedCount > 0 || entry.progressPercent >= 40)
    ) ?? null;
  const topActivity = getProgressTopActivities(progress, 1)[0] ?? null;

  if (!track?.nextBadge) {
    return null;
  }

  const action = buildPracticeRecommendationAction(
    resolveActivityOperation(topActivity?.key ?? ''),
    topActivity?.averageAccuracy ?? getProgressAverageAccuracy(progress)
  );

  return {
    accent: 'indigo',
    action,
    description: topActivity
      ? `Najbliżej jest teraz tor ${track.label}. Do odznaki ${track.nextBadge.name} brakuje: ${track.nextBadge.summary}. Najszybciej podbije to ${topActivity.label.toLowerCase()}.`
      : `Najbliżej jest teraz tor ${track.label}. Do odznaki ${track.nextBadge.name} brakuje: ${track.nextBadge.summary}.`,
    priorityLabel: 'Tempo postępu',
    title: `Domknij tor: ${track.label}`,
  };
};

const getFallbackRecommendation = (
  progress: KangurProgressState
): KangurHomeRecommendation | null => {
  const topActivity = getProgressTopActivities(progress, 1)[0] ?? null;
  if (!topActivity) {
    return null;
  }

  return {
    accent: 'violet',
    action: buildPracticeRecommendationAction(
      resolveActivityOperation(topActivity.key),
      topActivity.averageAccuracy
    ),
    description: `${topActivity.label} daje teraz średnio ${topActivity.averageXpPerSession} XP na grę. To najlepszy kandydat na kolejny mocny ruch.`,
    priorityLabel: 'Dobra passa',
    title: `Utrzymaj tempo w: ${topActivity.label}`,
  };
};

const getHomeRecommendation = (
  progress: KangurProgressState
): KangurHomeRecommendation | null =>
  getWeakestLessonRecommendation(progress) ??
  getGuidedRecommendation(progress) ??
  getStreakRecommendation(progress) ??
  getTrackRecommendation(progress) ??
  getFallbackRecommendation(progress);

const HOME_MOMENTUM_ROUTE_ACKNOWLEDGE_MS = 110;

const buildHomeMomentumTransitionSourceId = (action: KangurRouteAction): string => {
  const queryToken =
    action.query?.['focus'] ??
    action.query?.['operation'] ??
    action.query?.['quickStart'] ??
    'default';
  return `game-home-momentum:${action.page.toLowerCase()}:${queryToken}`;
};

export default function KangurGameHomeMomentumWidget({
  basePath,
  progress,
}: KangurGameHomeMomentumWidgetProps): React.JSX.Element | null {
  const recommendation = getHomeRecommendation(progress);

  if (!recommendation) {
    return null;
  }

  const recommendationAction = recommendation.action;
  const recommendationHref = buildAssignmentHref(basePath, recommendationAction);
  const recommendationTargetPageKey = recommendationAction.page;

  return (
    <KangurRecommendationCard
      action={
        <KangurButton
          asChild
          className='w-full sm:w-auto sm:shrink-0'
          size='sm'
          variant='primary'
        >
          <Link
            href={recommendationHref}
            targetPageKey={recommendationTargetPageKey}
            transitionAcknowledgeMs={HOME_MOMENTUM_ROUTE_ACKNOWLEDGE_MS}
            transitionSourceId={buildHomeMomentumTransitionSourceId(recommendationAction)}
          >
            {recommendationAction.label}
          </Link>
        </KangurButton>
      }
      accent={recommendation.accent}
      bodyClassName='min-w-0'
      className='rounded-[28px]'
      contentClassName='gap-3 sm:flex-row sm:items-start sm:justify-between'
      dataTestId='kangur-home-momentum-widget'
      description={recommendation.description}
      descriptionClassName='mt-1 opacity-85'
      descriptionRelaxed
      descriptionSize='xs'
      descriptionTestId='kangur-home-momentum-description'
      label={recommendation.priorityLabel}
      labelSize='sm'
      labelStyle='caps'
      labelTestId='kangur-home-momentum-label'
      title={recommendation.title}
      titleClassName='mt-3'
      titleTestId='kangur-home-momentum-title'
    />
  );
}

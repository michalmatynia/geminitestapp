import {
  appendKangurUrlParams,
  getKangurPageHref as createPageUrl,
} from '@/features/kangur/config/routing';
import { KANGUR_LESSON_LIBRARY } from '@/features/kangur/settings';
import { KangurTransitionLink as Link } from '@/features/kangur/ui/components/KangurTransitionLink';
import {
  KangurButton,
  KangurInfoCard,
  KangurStatusChip,
} from '@/features/kangur/ui/design/primitives';
import {
  getProgressAverageAccuracy,
  getProgressBadgeTrackSummaries,
  getProgressTopActivities,
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
      label: 'Otworz lekcje',
      page: 'Lessons',
      query: {
        focus: componentId,
      },
    },
    description: `Opanowanie ${entry.masteryPercent}%. Jedna krotka powtorka tej lekcji szybciej domknie kolejny prog mistrzostwa.`,
    priorityLabel: entry.masteryPercent < 60 ? 'Priorytet wysoki' : 'Priorytet sredni',
    title: `Dzis warto: ${lesson.title}`,
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
        ? 'Jedna krotka gra dzisiaj uruchomi nowa serie i pomoze podtrzymac rytm nauki.'
        : `Masz serie ${currentWinStreak}. Jeszcze jedna mocna runda dzisiaj ja rozpedzi.`,
    priorityLabel: 'Priorytet sredni',
    title: currentWinStreak <= 0 ? 'Zbuduj serie na nowo' : 'Rozpedz aktualna serie',
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
      ? `Najblizej jest teraz tor ${track.label}. Do odznaki ${track.nextBadge.name} brakuje: ${track.nextBadge.summary}. Najszybciej podbije to ${topActivity.label.toLowerCase()}.`
      : `Najblizej jest teraz tor ${track.label}. Do odznaki ${track.nextBadge.name} brakuje: ${track.nextBadge.summary}.`,
    priorityLabel: 'Tempo postepu',
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
    description: `${topActivity.label} daje teraz srednio ${topActivity.averageXpPerSession} XP na gre. To najlepszy kandydat na kolejny mocny ruch.`,
    priorityLabel: 'Dobra passa',
    title: `Utrzymaj tempo w: ${topActivity.label}`,
  };
};

const getHomeRecommendation = (
  progress: KangurProgressState
): KangurHomeRecommendation | null =>
  getWeakestLessonRecommendation(progress) ??
  getStreakRecommendation(progress) ??
  getTrackRecommendation(progress) ??
  getFallbackRecommendation(progress);

export default function KangurGameHomeMomentumWidget({
  basePath,
  progress,
}: KangurGameHomeMomentumWidgetProps): React.JSX.Element | null {
  const recommendation = getHomeRecommendation(progress);

  if (!recommendation) {
    return null;
  }

  return (
    <KangurInfoCard
      accent={recommendation.accent}
      className='rounded-[28px]'
      data-testid='kangur-home-momentum-widget'
      padding='md'
      tone='accent'
    >
      <div className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
        <div className='min-w-0'>
          <KangurStatusChip
            accent={recommendation.accent}
            className='text-[11px] uppercase tracking-[0.16em]'
            data-testid='kangur-home-momentum-label'
            size='sm'
          >
            {recommendation.priorityLabel}
          </KangurStatusChip>
          <p
            className='mt-3 text-sm font-semibold'
            data-testid='kangur-home-momentum-title'
          >
            {recommendation.title}
          </p>
          <p
            className='mt-1 text-xs opacity-85'
            data-testid='kangur-home-momentum-description'
          >
            {recommendation.description}
          </p>
        </div>
        <KangurButton asChild className='shrink-0' size='sm' variant='primary'>
          <Link
            href={buildAssignmentHref(basePath, recommendation.action)}
            targetPageKey={recommendation.action.page}
          >
            {recommendation.action.label}
          </Link>
        </KangurButton>
      </div>
    </KangurInfoCard>
  );
}

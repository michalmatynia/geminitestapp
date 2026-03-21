import {
  appendKangurUrlParams,
  getKangurPageHref as createPageUrl,
} from '@/features/kangur/config/routing';
import { getLocalizedKangurLessonTitle } from '@/features/kangur/lessons/lesson-catalog-i18n';
import { KANGUR_LESSON_LIBRARY } from '@/features/kangur/settings';
import { useLocale, useTranslations } from 'next-intl';
import KangurRecommendationCard from '@/features/kangur/ui/components/KangurRecommendationCard';
import { KangurTransitionLink as Link } from '@/features/kangur/ui/components/KangurTransitionLink';
import { KangurButton } from '@/features/kangur/ui/design/primitives';
import { KANGUR_PANEL_ROW_CLASSNAME } from '@/features/kangur/ui/design/tokens';
import {
  resolveLocalizedRecommendationActivityLabel,
  translateRecommendationWithFallback,
  type RecommendationTranslate,
} from '@/features/kangur/ui/services/recommendation-i18n';
import {
  getProgressAverageAccuracy,
  getProgressBadgeTrackSummaries,
  getProgressTopActivities,
  getRecommendedSessionMomentum,
} from '@/features/kangur/ui/services/progress';
import type { KangurProgressTranslate } from '@/features/kangur/ui/services/progress-i18n';
import type {
  KangurBasePathProgressProps,
  KangurLessonMasteryEntry,
  KangurProgressState,
} from '@/features/kangur/ui/types';
import type { KangurLessonComponentId, KangurRouteAction } from '@/features/kangur/shared/contracts/kangur';
type KangurGameHomeMomentumWidgetProps = KangurBasePathProgressProps;

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
  averageAccuracy: number,
  translate?: RecommendationTranslate
): KangurRouteAction => {
  if (!operation || !QUICK_START_OPERATIONS.has(operation)) {
    return {
      label: translateRecommendationWithFallback(
        translate,
        'homeMomentum.actions.startTraining',
        'Uruchom trening'
      ),
      page: 'Game',
      query: {
        quickStart: 'training',
      },
    };
  }

  return {
    label: translateRecommendationWithFallback(
      translate,
      'homeMomentum.actions.startTraining',
      'Uruchom trening'
    ),
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
  progress: KangurProgressState,
  locale: string,
  translate?: RecommendationTranslate
): KangurHomeRecommendation | null => {
  const weakestLesson = (
    Object.entries(progress.lessonMastery) as [KangurLessonComponentId, KangurLessonMasteryEntry][]
  )
    .filter(([, entry]) => entry.attempts > 0 && entry.masteryPercent < 80)
    .sort((left, right) => left[1].masteryPercent - right[1].masteryPercent)[0];

  if (!weakestLesson) {
    return null;
  }

  const [lessonId, entry] = weakestLesson;
  const lesson = KANGUR_LESSON_LIBRARY[lessonId];
  if (!lesson) {
    return null;
  }
  const lessonTitle = getLocalizedKangurLessonTitle(lessonId, locale, lesson.title);

  return {
    accent: entry.masteryPercent < 60 ? 'rose' : 'amber',
    action: {
      label: translateRecommendationWithFallback(
        translate,
        'homeMomentum.actions.openLesson',
        'Otwórz lekcję'
      ),
      page: 'Lessons',
      query: {
        focus: lessonId,
      },
    },
    description: translateRecommendationWithFallback(
      translate,
      'homeMomentum.weakestLesson.description',
      `Opanowanie ${entry.masteryPercent}%. Jedna krótka powtórka tej lekcji szybciej domknie kolejny próg mistrzostwa.`,
      { masteryPercent: entry.masteryPercent }
    ),
    priorityLabel:
      entry.masteryPercent < 60
        ? translateRecommendationWithFallback(
            translate,
            'homeMomentum.weakestLesson.priorityHigh',
            'Priorytet wysoki'
          )
        : translateRecommendationWithFallback(
            translate,
            'homeMomentum.weakestLesson.priorityMedium',
            'Priorytet średni'
          ),
    title: translateRecommendationWithFallback(
      translate,
      'homeMomentum.weakestLesson.title',
      `Dziś warto: ${lessonTitle}`,
      { title: lessonTitle }
    ),
  };
};

const getStreakRecommendation = (
  progress: KangurProgressState,
  translate?: RecommendationTranslate
): KangurHomeRecommendation | null => {
  const gamesPlayed = progress.gamesPlayed ?? 0;
  const currentWinStreak = progress.currentWinStreak ?? 0;

  if (gamesPlayed <= 0 || currentWinStreak >= 2) {
    return null;
  }

  return {
    accent: 'violet',
    action: {
      label: translateRecommendationWithFallback(
        translate,
        'homeMomentum.actions.playNow',
        'Zagraj teraz'
      ),
      page: 'Game',
      query: {
        quickStart: 'training',
      },
    },
    description:
      currentWinStreak <= 0
        ? translateRecommendationWithFallback(
            translate,
            'homeMomentum.streak.descriptionStart',
            'Jedna krótka gra dzisiaj uruchomi nową serię i pomoże podtrzymać rytm nauki.'
          )
        : translateRecommendationWithFallback(
            translate,
            'homeMomentum.streak.descriptionContinue',
            `Masz serię ${currentWinStreak}. Jeszcze jedna mocna runda dzisiaj ją rozpędzi.`,
            { streak: currentWinStreak }
          ),
    priorityLabel: translateRecommendationWithFallback(
      translate,
      'homeMomentum.streak.priority',
      'Priorytet średni'
    ),
    title:
      currentWinStreak <= 0
        ? translateRecommendationWithFallback(
            translate,
            'homeMomentum.streak.titleStart',
            'Zbuduj serię na nowo'
          )
        : translateRecommendationWithFallback(
            translate,
            'homeMomentum.streak.titleContinue',
            'Rozpędź aktualną serię'
          ),
  };
};

const getGuidedRecommendation = (
  progress: KangurProgressState,
  translate?: RecommendationTranslate,
  progressTranslate?: KangurProgressTranslate
): KangurHomeRecommendation | null => {
  const progressLocalizer = { translate: progressTranslate };
  const guidedMomentum = getRecommendedSessionMomentum(progress, progressLocalizer);
  if (guidedMomentum.completedSessions <= 0 || !guidedMomentum.nextBadgeName) {
    return null;
  }

  const topActivity = getProgressTopActivities(progress, 1, progressLocalizer)[0] ?? null;
  const activityLabel = topActivity
    ? resolveLocalizedRecommendationActivityLabel({
        activityKey: topActivity.key,
        fallbackLabel: topActivity.label,
        translate,
      })
    : null;
  const action = buildPracticeRecommendationAction(
    resolveActivityOperation(topActivity?.key ?? ''),
    topActivity?.averageAccuracy ?? getProgressAverageAccuracy(progress),
    translate
  );

  return {
    accent: 'indigo',
    action,
    description: topActivity
      ? translateRecommendationWithFallback(
          translate,
          'homeMomentum.guided.descriptionWithActivity',
          `Masz już ${guidedMomentum.summary} w poleconym rytmie. Jeszcze jedna mocna runda ${activityLabel?.toLowerCase()} przybliża odznakę ${guidedMomentum.nextBadgeName}.`,
          {
            summary: guidedMomentum.summary,
            activity: activityLabel?.toLowerCase() ?? '',
            nextBadgeName: guidedMomentum.nextBadgeName,
          }
        )
      : translateRecommendationWithFallback(
          translate,
          'homeMomentum.guided.descriptionDefault',
          `Masz już ${guidedMomentum.summary} w poleconym rytmie. Jeszcze jedna mocna runda przybliża odznakę ${guidedMomentum.nextBadgeName}.`,
          {
            summary: guidedMomentum.summary,
            nextBadgeName: guidedMomentum.nextBadgeName,
          }
        ),
    priorityLabel: translateRecommendationWithFallback(
      translate,
      'homeMomentum.guided.priority',
      'Polecony kierunek'
    ),
    title: translateRecommendationWithFallback(
      translate,
      'homeMomentum.guided.title',
      `Dopnij: ${guidedMomentum.nextBadgeName}`,
      { nextBadgeName: guidedMomentum.nextBadgeName }
    ),
  };
};

const getTrackRecommendation = (
  progress: KangurProgressState,
  translate?: RecommendationTranslate,
  progressTranslate?: KangurProgressTranslate
): KangurHomeRecommendation | null => {
  const progressLocalizer = { translate: progressTranslate };
  const track =
    getProgressBadgeTrackSummaries(progress, { maxTracks: 6 }, progressLocalizer).find(
      (entry) =>
        Boolean(entry.nextBadge) && (entry.unlockedCount > 0 || entry.progressPercent >= 40)
    ) ?? null;
  const topActivity = getProgressTopActivities(progress, 1, progressLocalizer)[0] ?? null;
  const activityLabel = topActivity
    ? resolveLocalizedRecommendationActivityLabel({
        activityKey: topActivity.key,
        fallbackLabel: topActivity.label,
        translate,
      })
    : null;

  if (!track?.nextBadge) {
    return null;
  }

  const action = buildPracticeRecommendationAction(
    resolveActivityOperation(topActivity?.key ?? ''),
    topActivity?.averageAccuracy ?? getProgressAverageAccuracy(progress),
    translate
  );

  return {
    accent: 'indigo',
    action,
    description: topActivity
      ? translateRecommendationWithFallback(
          translate,
          'homeMomentum.track.descriptionWithActivity',
          `Najbliżej jest teraz tor ${track.label}. Do odznaki ${track.nextBadge.name} brakuje: ${track.nextBadge.summary}. Najszybciej podbije to ${activityLabel?.toLowerCase()}.`,
          {
            track: track.label,
            badge: track.nextBadge.name,
            summary: track.nextBadge.summary,
            activity: activityLabel?.toLowerCase() ?? '',
          }
        )
      : translateRecommendationWithFallback(
          translate,
          'homeMomentum.track.descriptionDefault',
          `Najbliżej jest teraz tor ${track.label}. Do odznaki ${track.nextBadge.name} brakuje: ${track.nextBadge.summary}.`,
          {
            track: track.label,
            badge: track.nextBadge.name,
            summary: track.nextBadge.summary,
          }
        ),
    priorityLabel: translateRecommendationWithFallback(
      translate,
      'homeMomentum.track.priority',
      'Tempo postępu'
    ),
    title: translateRecommendationWithFallback(
      translate,
      'homeMomentum.track.title',
      `Domknij tor: ${track.label}`,
      { track: track.label }
    ),
  };
};

const getFallbackRecommendation = (
  progress: KangurProgressState,
  translate?: RecommendationTranslate,
  progressTranslate?: KangurProgressTranslate
): KangurHomeRecommendation | null => {
  const topActivity = getProgressTopActivities(progress, 1, { translate: progressTranslate })[0] ?? null;
  if (!topActivity) {
    return null;
  }
  const activityLabel = resolveLocalizedRecommendationActivityLabel({
    activityKey: topActivity.key,
    fallbackLabel: topActivity.label,
    translate,
  });

  return {
    accent: 'violet',
    action: buildPracticeRecommendationAction(
      resolveActivityOperation(topActivity.key),
      topActivity.averageAccuracy,
      translate
    ),
    description: translateRecommendationWithFallback(
      translate,
      'homeMomentum.fallback.description',
      `${activityLabel} daje teraz średnio ${topActivity.averageXpPerSession} XP na grę. To najlepszy kandydat na kolejny mocny ruch.`,
      {
        activity: activityLabel,
        averageXpPerSession: topActivity.averageXpPerSession,
      }
    ),
    priorityLabel: translateRecommendationWithFallback(
      translate,
      'homeMomentum.fallback.priority',
      'Dobra passa'
    ),
    title: translateRecommendationWithFallback(
      translate,
      'homeMomentum.fallback.title',
      `Utrzymaj tempo w: ${activityLabel}`,
      { activity: activityLabel }
    ),
  };
};

const getHomeRecommendation = (
  progress: KangurProgressState,
  locale: string,
  translate?: RecommendationTranslate,
  progressTranslate?: KangurProgressTranslate
): KangurHomeRecommendation | null =>
  getWeakestLessonRecommendation(progress, locale, translate) ??
  getGuidedRecommendation(progress, translate, progressTranslate) ??
  getStreakRecommendation(progress, translate) ??
  getTrackRecommendation(progress, translate, progressTranslate) ??
  getFallbackRecommendation(progress, translate, progressTranslate);

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
  const locale = useLocale();
  const translations = useTranslations('KangurGameRecommendations');
  const runtimeTranslations = useTranslations('KangurProgressRuntime');
  const recommendation = getHomeRecommendation(progress, locale, translations, runtimeTranslations);

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
      contentClassName={`${KANGUR_PANEL_ROW_CLASSNAME} sm:items-start sm:justify-between`}
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

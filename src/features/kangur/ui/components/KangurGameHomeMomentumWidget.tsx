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
import { normalizeSiteLocale } from '@/shared/lib/i18n/site-locale';
type KangurGameHomeMomentumWidgetProps = KangurBasePathProgressProps;

type KangurHomeRecommendation = {
  action: KangurRouteAction;
  accent: 'indigo' | 'violet' | 'amber' | 'rose';
  description: string;
  priorityLabel: string;
  title: string;
};

type KangurHomeMomentumFallbackCopy = {
  actions: {
    openLesson: string;
    playNow: string;
    startTraining: string;
  };
  weakestLesson: {
    description: (masteryPercent: number) => string;
    priorityHigh: string;
    priorityMedium: string;
    title: (title: string) => string;
  };
  streak: {
    descriptionContinue: (streak: number) => string;
    descriptionStart: string;
    priority: string;
    titleContinue: string;
    titleStart: string;
  };
  guided: {
    descriptionDefault: (summary: string, nextBadgeName: string) => string;
    descriptionWithActivity: (summary: string, activity: string, nextBadgeName: string) => string;
    priority: string;
    title: (nextBadgeName: string) => string;
  };
  track: {
    descriptionDefault: (track: string, badge: string, summary: string) => string;
    descriptionWithActivity: (
      track: string,
      badge: string,
      summary: string,
      activity: string
    ) => string;
    priority: string;
    title: (track: string) => string;
  };
  fallback: {
    description: (activity: string, averageXpPerSession: number) => string;
    priority: string;
    title: (activity: string) => string;
  };
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
const ACTIVITY_OPERATION_KINDS = new Set([
  'game',
  'lesson_completion',
  'lesson_practice',
  'training',
]);

const getHomeMomentumFallbackCopy = (
  locale: ReturnType<typeof normalizeSiteLocale>
): KangurHomeMomentumFallbackCopy => {
  if (locale === 'uk') {
    return {
      actions: {
        openLesson: 'Відкрити урок',
        playNow: 'Грати зараз',
        startTraining: 'Почати тренування',
      },
      weakestLesson: {
        description: (masteryPercent) =>
          `Опановування ${masteryPercent}%. Коротке повторення цього уроку швидше закриє наступний поріг майстерності.`,
        priorityHigh: 'Високий пріоритет',
        priorityMedium: 'Середній пріоритет',
        title: (title) => `Сьогодні варто: ${title}`,
      },
      streak: {
        descriptionContinue: (streak) =>
          `У тебе серія ${streak}. Ще один сильний раунд сьогодні допоможе її розігнати.`,
        descriptionStart:
          'Одна коротка гра сьогодні запустить нову серію й допоможе зберегти ритм навчання.',
        priority: 'Середній пріоритет',
        titleContinue: 'Розжени поточну серію',
        titleStart: 'Запусти серію знову',
      },
      guided: {
        descriptionDefault: (summary, nextBadgeName) =>
          `У тебе вже є ${summary} у рекомендованому ритмі. Ще один сильний раунд наблизить значок ${nextBadgeName}.`,
        descriptionWithActivity: (summary, activity, nextBadgeName) =>
          `У тебе вже є ${summary} у рекомендованому ритмі. Ще один сильний раунд ${activity} наблизить значок ${nextBadgeName}.`,
        priority: 'Рекомендований напрям',
        title: (nextBadgeName) => `Заверши: ${nextBadgeName}`,
      },
      track: {
        descriptionDefault: (track, badge, summary) =>
          `Найближче зараз шлях ${track}. До значка ${badge} бракує: ${summary}.`,
        descriptionWithActivity: (track, badge, summary, activity) =>
          `Найближче зараз шлях ${track}. До значка ${badge} бракує: ${summary}. Найшвидше це підштовхне ${activity}.`,
        priority: 'Темп прогресу',
        title: (track) => `Закрий шлях: ${track}`,
      },
      fallback: {
        description: (activity, averageXpPerSession) =>
          `${activity} зараз приносить у середньому ${averageXpPerSession} XP за гру. Це найсильніший крок для наступного раунду.`,
        priority: 'Сильна серія',
        title: (activity) => `Тримай темп у: ${activity}`,
      },
    };
  }

  if (locale === 'de') {
    return {
      actions: {
        openLesson: 'Lektion offnen',
        playNow: 'Jetzt spielen',
        startTraining: 'Training starten',
      },
      weakestLesson: {
        description: (masteryPercent) =>
          `Beherrschung ${masteryPercent}%. Eine kurze Wiederholung dieser Lektion schliesst die nachste Meisterschaftsstufe schneller.`,
        priorityHigh: 'Hohe Prioritat',
        priorityMedium: 'Mittlere Prioritat',
        title: (title) => `Heute lohnt sich: ${title}`,
      },
      streak: {
        descriptionContinue: (streak) =>
          `Deine Serie ist ${streak}. Noch eine starke Runde heute wird sie beschleunigen.`,
        descriptionStart:
          'Ein kurzes Spiel heute startet eine neue Serie und halt den Lernrhythmus in Bewegung.',
        priority: 'Mittlere Prioritat',
        titleContinue: 'Aktuelle Serie beschleunigen',
        titleStart: 'Serie neu starten',
      },
      guided: {
        descriptionDefault: (summary, nextBadgeName) =>
          `Du hast bereits ${summary} im empfohlenen Rhythmus. Noch eine starke Runde bringt das Abzeichen ${nextBadgeName} naher.`,
        descriptionWithActivity: (summary, activity, nextBadgeName) =>
          `Du hast bereits ${summary} im empfohlenen Rhythmus. Noch eine starke Runde ${activity} bringt das Abzeichen ${nextBadgeName} naher.`,
        priority: 'Empfohlene Richtung',
        title: (nextBadgeName) => `Abschliessen: ${nextBadgeName}`,
      },
      track: {
        descriptionDefault: (track, badge, summary) =>
          `Am nachsten ist jetzt der Pfad ${track}. Fur das Abzeichen ${badge} fehlt noch: ${summary}.`,
        descriptionWithActivity: (track, badge, summary, activity) =>
          `Am nachsten ist jetzt der Pfad ${track}. Fur das Abzeichen ${badge} fehlt noch: ${summary}. ${activity} schiebt ihn am schnellsten an.`,
        priority: 'Fortschrittstempo',
        title: (track) => `Pfad schliessen: ${track}`,
      },
      fallback: {
        description: (activity, averageXpPerSession) =>
          `${activity} bringt derzeit etwa ${averageXpPerSession} XP pro Spiel. Das ist der starkste Zug fur die nachste Runde.`,
        priority: 'Starke Phase',
        title: (activity) => `Tempo halten in: ${activity}`,
      },
    };
  }

  if (locale === 'en') {
    return {
      actions: {
        openLesson: 'Open lesson',
        playNow: 'Play now',
        startTraining: 'Start training',
      },
      weakestLesson: {
        description: (masteryPercent) =>
          `Mastery ${masteryPercent}%. One short review of this lesson will close the next mastery step faster.`,
        priorityHigh: 'High priority',
        priorityMedium: 'Medium priority',
        title: (title) => `Today, revisit: ${title}`,
      },
      streak: {
        descriptionContinue: (streak) =>
          `Your streak is ${streak}. One more strong round today will speed it up.`,
        descriptionStart:
          'One short game today will start a new streak and help keep the learning rhythm going.',
        priority: 'Medium priority',
        titleContinue: 'Build the current streak',
        titleStart: 'Restart the streak',
      },
      guided: {
        descriptionDefault: (summary, nextBadgeName) =>
          `You already have ${summary} in the recommended rhythm. One more strong round brings the ${nextBadgeName} badge closer.`,
        descriptionWithActivity: (summary, activity, nextBadgeName) =>
          `You already have ${summary} in the recommended rhythm. One more strong round of ${activity} brings the ${nextBadgeName} badge closer.`,
        priority: 'Recommended direction',
        title: (nextBadgeName) => `Finish: ${nextBadgeName}`,
      },
      track: {
        descriptionDefault: (track, badge, summary) =>
          `The ${track} track is currently closest. To reach the ${badge} badge, you still need: ${summary}.`,
        descriptionWithActivity: (track, badge, summary, activity) =>
          `The ${track} track is currently closest. To reach the ${badge} badge, you still need: ${summary}. ${activity} will push it the fastest.`,
        priority: 'Progress pace',
        title: (track) => `Close the track: ${track}`,
      },
      fallback: {
        description: (activity, averageXpPerSession) =>
          `${activity} is currently worth about ${averageXpPerSession} XP per game. It is the strongest move for the next round.`,
        priority: 'Strong run',
        title: (activity) => `Keep the pace in: ${activity}`,
      },
    };
  }

  return {
    actions: {
      openLesson: 'Otwórz lekcję',
      playNow: 'Zagraj teraz',
      startTraining: 'Uruchom trening',
    },
    weakestLesson: {
      description: (masteryPercent) =>
        `Opanowanie ${masteryPercent}%. Jedna krótka powtórka tej lekcji szybciej domknie kolejny próg mistrzostwa.`,
      priorityHigh: 'Priorytet wysoki',
      priorityMedium: 'Priorytet średni',
      title: (title) => `Dziś warto: ${title}`,
    },
    streak: {
      descriptionContinue: (streak) =>
        `Masz serię ${streak}. Jeszcze jedna mocna runda dzisiaj ją rozpędzi.`,
      descriptionStart:
        'Jedna krótka gra dzisiaj uruchomi nową serię i pomoże podtrzymać rytm nauki.',
      priority: 'Priorytet średni',
      titleContinue: 'Rozpędź aktualną serię',
      titleStart: 'Zbuduj serię na nowo',
    },
    guided: {
      descriptionDefault: (summary, nextBadgeName) =>
        `Masz już ${summary} w poleconym rytmie. Jeszcze jedna mocna runda przybliża odznakę ${nextBadgeName}.`,
      descriptionWithActivity: (summary, activity, nextBadgeName) =>
        `Masz już ${summary} w poleconym rytmie. Jeszcze jedna mocna runda ${activity} przybliża odznakę ${nextBadgeName}.`,
      priority: 'Polecony kierunek',
      title: (nextBadgeName) => `Dopnij: ${nextBadgeName}`,
    },
    track: {
      descriptionDefault: (track, badge, summary) =>
        `Najbliżej jest teraz tor ${track}. Do odznaki ${badge} brakuje: ${summary}.`,
      descriptionWithActivity: (track, badge, summary, activity) =>
        `Najbliżej jest teraz tor ${track}. Do odznaki ${badge} brakuje: ${summary}. Najszybciej podbije to ${activity}.`,
      priority: 'Tempo postępu',
      title: (track) => `Domknij tor: ${track}`,
    },
    fallback: {
      description: (activity, averageXpPerSession) =>
        `${activity} daje teraz średnio ${averageXpPerSession} XP na grę. To najlepszy kandydat na kolejny mocny ruch.`,
      priority: 'Dobra passa',
      title: (activity) => `Utrzymaj tempo w: ${activity}`,
    },
  };
};

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
  fallbackCopy: KangurHomeMomentumFallbackCopy,
  translate?: RecommendationTranslate
): KangurRouteAction => {
  if (!operation || !QUICK_START_OPERATIONS.has(operation)) {
    return {
      label: translateRecommendationWithFallback(
        translate,
        'homeMomentum.actions.startTraining',
        fallbackCopy.actions.startTraining
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
      fallbackCopy.actions.startTraining
    ),
    page: 'Game',
    query: {
      quickStart: 'operation',
      operation,
      difficulty: resolvePracticeDifficulty(averageAccuracy),
    },
  };
};

const isActivityOperationKind = (kind: string): boolean => ACTIVITY_OPERATION_KINDS.has(kind);

const resolveActivityOperation = (activityKey: string): string | null => {
  const parts = activityKey.split(':');
  const kind = (parts[0] ?? '').trim();
  const normalizedPrimary = (parts[1] ?? parts[0] ?? '').trim();

  if (!normalizedPrimary) {
    return null;
  }

  if (parts.length === 1) {
    return normalizedPrimary;
  }

  return isActivityOperationKind(kind) ? normalizedPrimary : null;
};

const getWeakestLessonRecommendation = (
  progress: KangurProgressState,
  locale: string,
  fallbackCopy: KangurHomeMomentumFallbackCopy,
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
        fallbackCopy.actions.openLesson
      ),
      page: 'Lessons',
      query: {
        focus: lessonId,
      },
    },
    description: translateRecommendationWithFallback(
      translate,
      'homeMomentum.weakestLesson.description',
      fallbackCopy.weakestLesson.description(entry.masteryPercent),
      { masteryPercent: entry.masteryPercent }
    ),
    priorityLabel:
      entry.masteryPercent < 60
        ? translateRecommendationWithFallback(
            translate,
            'homeMomentum.weakestLesson.priorityHigh',
            fallbackCopy.weakestLesson.priorityHigh
          )
        : translateRecommendationWithFallback(
            translate,
            'homeMomentum.weakestLesson.priorityMedium',
            fallbackCopy.weakestLesson.priorityMedium
          ),
    title: translateRecommendationWithFallback(
      translate,
      'homeMomentum.weakestLesson.title',
      fallbackCopy.weakestLesson.title(lessonTitle),
      { title: lessonTitle }
    ),
  };
};

const getStreakRecommendation = (
  progress: KangurProgressState,
  fallbackCopy: KangurHomeMomentumFallbackCopy,
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
        fallbackCopy.actions.playNow
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
            fallbackCopy.streak.descriptionStart
          )
        : translateRecommendationWithFallback(
            translate,
            'homeMomentum.streak.descriptionContinue',
            fallbackCopy.streak.descriptionContinue(currentWinStreak),
            { streak: currentWinStreak }
          ),
    priorityLabel: translateRecommendationWithFallback(
      translate,
      'homeMomentum.streak.priority',
      fallbackCopy.streak.priority
    ),
    title:
      currentWinStreak <= 0
        ? translateRecommendationWithFallback(
            translate,
            'homeMomentum.streak.titleStart',
            fallbackCopy.streak.titleStart
          )
        : translateRecommendationWithFallback(
            translate,
            'homeMomentum.streak.titleContinue',
            fallbackCopy.streak.titleContinue
          ),
  };
};

const getGuidedRecommendation = (
  progress: KangurProgressState,
  fallbackCopy: KangurHomeMomentumFallbackCopy,
  translate?: RecommendationTranslate,
  progressTranslate?: KangurProgressTranslate
): KangurHomeRecommendation | null => {
  const progressLocalizer = { translate: progressTranslate };
  const guidedMomentum = getRecommendedSessionMomentum(progress, progressLocalizer);
  if (guidedMomentum.completedSessions <= 0 || !guidedMomentum.nextBadgeName) {
    return null;
  }

  const topActivityContext = resolveRecommendationTopActivityContext({
    fallbackCopy,
    progress,
    progressTranslate,
    translate,
  });

  return {
    accent: 'indigo',
    action: topActivityContext.action,
    description: resolveGuidedRecommendationDescription({
      fallbackCopy,
      guidedMomentum,
      topActivityContext,
      translate,
    }),
    priorityLabel: translateRecommendationWithFallback(
      translate,
      'homeMomentum.guided.priority',
      fallbackCopy.guided.priority
    ),
    title: translateRecommendationWithFallback(
      translate,
      'homeMomentum.guided.title',
      fallbackCopy.guided.title(guidedMomentum.nextBadgeName),
      { nextBadgeName: guidedMomentum.nextBadgeName }
    ),
  };
};

const getTrackRecommendation = (
  progress: KangurProgressState,
  fallbackCopy: KangurHomeMomentumFallbackCopy,
  translate?: RecommendationTranslate,
  progressTranslate?: KangurProgressTranslate
): KangurHomeRecommendation | null => {
  const track = resolveTrackRecommendationTarget(progress, progressTranslate);

  if (!track?.nextBadge) {
    return null;
  }

  const topActivityContext = resolveRecommendationTopActivityContext({
    fallbackCopy,
    progress,
    progressTranslate,
    translate,
  });

  return {
    accent: 'indigo',
    action: topActivityContext.action,
    description: resolveTrackRecommendationDescription({
      fallbackCopy,
      topActivityContext,
      track,
      translate,
    }),
    priorityLabel: translateRecommendationWithFallback(
      translate,
      'homeMomentum.track.priority',
      fallbackCopy.track.priority
    ),
    title: translateRecommendationWithFallback(
      translate,
      'homeMomentum.track.title',
      fallbackCopy.track.title(track.label),
      { track: track.label }
    ),
  };
};

type KangurRecommendationTopActivityContext = {
  action: KangurRouteAction;
  activityLabel: string | null;
  topActivity: ReturnType<typeof getProgressTopActivities>[number] | null;
};

const resolveRecommendationTopActivityLabel = ({
  topActivity,
  translate,
}: {
  topActivity: ReturnType<typeof getProgressTopActivities>[number] | null;
  translate?: RecommendationTranslate;
}): string | null =>
  topActivity
    ? resolveLocalizedRecommendationActivityLabel({
        activityKey: topActivity.key,
        fallbackLabel: topActivity.label,
        translate,
      })
    : null;

const resolveRecommendationTopActivityContext = ({
  fallbackCopy,
  progress,
  progressTranslate,
  translate,
}: {
  fallbackCopy: KangurHomeMomentumFallbackCopy;
  progress: KangurProgressState;
  progressTranslate?: KangurProgressTranslate;
  translate?: RecommendationTranslate;
}): KangurRecommendationTopActivityContext => {
  const topActivity = getProgressTopActivities(progress, 1, { translate: progressTranslate })[0] ?? null;
  const activityLabel = resolveRecommendationTopActivityLabel({ topActivity, translate });

  return {
    action: buildPracticeRecommendationAction(
      resolveActivityOperation(topActivity?.key ?? ''),
      topActivity?.averageAccuracy ?? getProgressAverageAccuracy(progress),
      fallbackCopy,
      translate
    ),
    activityLabel,
    topActivity,
  };
};

const resolveGuidedRecommendationDescription = ({
  fallbackCopy,
  guidedMomentum,
  topActivityContext,
  translate,
}: {
  fallbackCopy: KangurHomeMomentumFallbackCopy;
  guidedMomentum: ReturnType<typeof getRecommendedSessionMomentum>;
  topActivityContext: KangurRecommendationTopActivityContext;
  translate?: RecommendationTranslate;
}): string => {
  const normalizedActivityLabel = topActivityContext.activityLabel?.toLowerCase() ?? '';

  if (topActivityContext.topActivity) {
    return translateRecommendationWithFallback(
      translate,
      'homeMomentum.guided.descriptionWithActivity',
      fallbackCopy.guided.descriptionWithActivity(
        guidedMomentum.summary,
        normalizedActivityLabel,
        guidedMomentum.nextBadgeName
      ),
      {
        summary: guidedMomentum.summary,
        activity: normalizedActivityLabel,
        nextBadgeName: guidedMomentum.nextBadgeName,
      }
    );
  }

  return translateRecommendationWithFallback(
    translate,
    'homeMomentum.guided.descriptionDefault',
    fallbackCopy.guided.descriptionDefault(
      guidedMomentum.summary,
      guidedMomentum.nextBadgeName
    ),
    {
      summary: guidedMomentum.summary,
      nextBadgeName: guidedMomentum.nextBadgeName,
    }
  );
};

const isTrackRecommendationCandidate = (
  entry: ReturnType<typeof getProgressBadgeTrackSummaries>[number]
): boolean => Boolean(entry.nextBadge) && (entry.unlockedCount > 0 || entry.progressPercent >= 40);

const resolveTrackRecommendationTarget = (
  progress: KangurProgressState,
  progressTranslate?: KangurProgressTranslate
): ReturnType<typeof getProgressBadgeTrackSummaries>[number] | null =>
  getProgressBadgeTrackSummaries(progress, { maxTracks: 6 }, { translate: progressTranslate }).find(
    isTrackRecommendationCandidate
  ) ?? null;

const resolveTrackRecommendationDescription = ({
  fallbackCopy,
  topActivityContext,
  track,
  translate,
}: {
  fallbackCopy: KangurHomeMomentumFallbackCopy;
  topActivityContext: KangurRecommendationTopActivityContext;
  track: NonNullable<ReturnType<typeof resolveTrackRecommendationTarget>>;
  translate?: RecommendationTranslate;
}): string => {
  const normalizedActivityLabel = topActivityContext.activityLabel?.toLowerCase() ?? '';

  if (topActivityContext.topActivity) {
    return translateRecommendationWithFallback(
      translate,
      'homeMomentum.track.descriptionWithActivity',
      fallbackCopy.track.descriptionWithActivity(
        track.label,
        track.nextBadge.name,
        track.nextBadge.summary,
        normalizedActivityLabel
      ),
      {
        track: track.label,
        badge: track.nextBadge.name,
        summary: track.nextBadge.summary,
        activity: normalizedActivityLabel,
      }
    );
  }

  return translateRecommendationWithFallback(
    translate,
    'homeMomentum.track.descriptionDefault',
    fallbackCopy.track.descriptionDefault(
      track.label,
      track.nextBadge.name,
      track.nextBadge.summary
    ),
    {
      track: track.label,
      badge: track.nextBadge.name,
      summary: track.nextBadge.summary,
    }
  );
};

const getFallbackRecommendation = (
  progress: KangurProgressState,
  fallbackCopy: KangurHomeMomentumFallbackCopy,
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
      fallbackCopy,
      translate
    ),
    description: translateRecommendationWithFallback(
      translate,
      'homeMomentum.fallback.description',
      fallbackCopy.fallback.description(activityLabel, topActivity.averageXpPerSession),
      {
        activity: activityLabel,
        averageXpPerSession: topActivity.averageXpPerSession,
      }
    ),
    priorityLabel: translateRecommendationWithFallback(
      translate,
      'homeMomentum.fallback.priority',
      fallbackCopy.fallback.priority
    ),
    title: translateRecommendationWithFallback(
      translate,
      'homeMomentum.fallback.title',
      fallbackCopy.fallback.title(activityLabel),
      { activity: activityLabel }
    ),
  };
};

const getHomeRecommendation = (
  progress: KangurProgressState,
  locale: string,
  fallbackCopy: KangurHomeMomentumFallbackCopy,
  translate?: RecommendationTranslate,
  progressTranslate?: KangurProgressTranslate
): KangurHomeRecommendation | null =>
  getWeakestLessonRecommendation(progress, locale, fallbackCopy, translate) ??
  getGuidedRecommendation(progress, fallbackCopy, translate, progressTranslate) ??
  getStreakRecommendation(progress, fallbackCopy, translate) ??
  getTrackRecommendation(progress, fallbackCopy, translate, progressTranslate) ??
  getFallbackRecommendation(progress, fallbackCopy, translate, progressTranslate);

const HOME_MOMENTUM_ROUTE_ACKNOWLEDGE_MS = 0;

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
  const normalizedLocale = normalizeSiteLocale(locale);
  const translations = useTranslations('KangurGameRecommendations');
  const runtimeTranslations = useTranslations('KangurProgressRuntime');
  const fallbackCopy = getHomeMomentumFallbackCopy(normalizedLocale);
  const recommendation = getHomeRecommendation(
    progress,
    normalizedLocale,
    fallbackCopy,
    translations,
    runtimeTranslations
  );

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
          className='w-full sm:w-auto sm:shrink-0 touch-manipulation select-none min-h-11 active:scale-[0.98]'
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

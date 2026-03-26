'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';
import type { TranslationValues } from 'use-intl';

import {
  appendKangurUrlParams,
  getKangurPageHref as createPageUrl,
} from '@/features/kangur/config/routing';
import {
  isRecoverableKangurClientFetchError,
  withKangurClientError,
} from '@/features/kangur/observability/client';
import { getKangurPlatform } from '@/features/kangur/services/kangur-platform';
import type { KangurScoreRecord } from '@kangur/platform';
import { KangurPanelSectionHeading } from '@/features/kangur/ui/components/KangurPanelSectionHeading';
import { KangurSessionHistoryRow } from '@/features/kangur/ui/components/KangurSessionHistoryRow';
import { KangurTransitionLink as Link } from '@/features/kangur/ui/components/KangurTransitionLink';
import {
  KangurButton,
  KangurEmptyState,
  KangurGlassPanel,
  KangurMetricCard,
  KangurProgressBar,
} from '@/features/kangur/ui/design/primitives';
import {
  KANGUR_PANEL_GAP_CLASSNAME,
  KANGUR_STACK_COMPACT_CLASSNAME,
  KANGUR_STACK_TIGHT_CLASSNAME,
  type KangurAccent,
} from '@/features/kangur/ui/design/tokens';
import { useKangurCoarsePointer } from '@/features/kangur/ui/hooks/useKangurCoarsePointer';
import { loadScopedKangurScores } from '@/features/kangur/ui/services/learner-profile-scores';
import {
  SCORE_INSIGHT_WINDOW_DAYS,
  buildKangurScoreInsights,
  resolveKangurScoreOperationInfo,
} from '@/features/kangur/ui/services/score-insights';
import { useKangurSubjectFocus } from '@/features/kangur/ui/context/KangurSubjectFocusContext';
import { resolveKangurScoreSubject } from '@/shared/contracts/kangur';
import { normalizeSiteLocale } from '@/shared/lib/i18n/site-locale';

type OperationBreakdown = {
  total: number;
  correct: number;
  count: number;
};

type ScoreHistoryProps = {
  learnerId?: string | null;
  playerName?: string | null;
  createdBy?: string | null;
  basePath?: string | null;
  prefetchedScores?: KangurScoreRecord[] | null;
  prefetchedLoading?: boolean;
};

type ScoreHistoryFallbackCopy = {
  byOperationHeading: string;
  emptyDescription: string;
  loadingDescription: string;
  loadingTitle: string;
  recentHeading: string;
  relative: {
    daysAgo: string;
    noActivity: string;
    today: string;
    yesterday: string;
  };
  shared: {
    noData: string;
    operationSummary: string;
  };
  strongest: {
    empty: string;
    label: string;
  };
  summary: {
    averageAccuracy: string;
    perfectGames: string;
    totalGames: string;
  };
  trend: {
    context: {
      down: string;
      flat: string;
      insufficient: string;
      up: string;
    };
    label: string;
    newRange: string;
  };
  weakest: {
    empty: string;
    label: string;
    reviewLesson: string;
  };
  window: {
    lastActivityPrefix: string;
    title: string;
    weeklySessions: string;
    weeklySummary: string;
    weeklyXp: string;
  };
};

const OP_ACCENTS: Record<string, KangurAccent> = {
  addition: 'amber',
  subtraction: 'rose',
  multiplication: 'violet',
  division: 'sky',
  decimals: 'teal',
  powers: 'amber',
  roots: 'indigo',
  clock: 'indigo',
  calendar: 'emerald',
  geometry: 'teal',
  mixed: 'violet',
  english_basics: 'emerald',
  english_parts_of_speech: 'indigo',
  english_sentence_structure: 'violet',
  english_subject_verb_agreement: 'teal',
  english_articles: 'amber',
  english_adjectives: 'indigo',
  english_adverbs_frequency: 'sky',
  english_prepositions_time_place: 'rose',
};

const kangurPlatform = getKangurPlatform();

const SCORE_FETCH_LIMIT = 30;
const getScoreHistoryFallbackCopy = (
  locale: ReturnType<typeof normalizeSiteLocale>
): ScoreHistoryFallbackCopy => {
  if (locale === 'uk') {
    return {
      byOperationHeading: 'Результати за операціями',
      emptyDescription: 'Немає збережених результатів.',
      loadingDescription: 'Отримуємо найновіші результати та готуємо підсумок прогресу.',
      loadingTitle: 'Завантаження результатів...',
      recentHeading: 'Останні ігри',
      relative: {
        daysAgo: '{days} днів тому',
        noActivity: 'Немає активності',
        today: 'Сьогодні',
        yesterday: 'Учора',
      },
      shared: {
        noData: 'Немає даних',
        operationSummary: 'У середньому {accuracy}% · спроб {attempts} · +{xp} XP / сесію',
      },
      strongest: {
        empty: 'Недостатньо даних, щоб визначити сильну сторону.',
        label: 'Сильна сторона',
      },
      summary: {
        averageAccuracy: 'Середня точність',
        perfectGames: 'Ідеальні результати',
        totalGames: 'Усього ігор',
      },
      trend: {
        context: {
          down: 'Спад з {previous}% до {recent}%.',
          flat: 'Стабільно: {recent}% тиждень до тижня.',
          insufficient: 'Потрібні старіші результати для порівняння.',
          up: 'Зростання з {previous}% до {recent}%.',
        },
        label: 'Тижневий тренд',
        newRange: 'Новий діапазон',
      },
      weakest: {
        empty:
          'Потрібно більше ніж один тип завдань, щоб визначити зону, яка потребує підтримки.',
        label: 'Потребує підтримки',
        reviewLesson: 'Повторити урок',
      },
      window: {
        lastActivityPrefix: 'Остання активність:',
        title: 'Огляд за останні {days} днів',
        weeklySessions: 'Сесій цього тижня',
        weeklySummary: 'У середньому {accuracy}% · ідеальних {perfect}',
        weeklyXp: 'XP: +{xp} · у середньому {average} за сесію',
      },
    };
  }

  if (locale === 'de') {
    return {
      byOperationHeading: 'Ergebnisse nach Operation',
      emptyDescription: 'Keine gespeicherten Ergebnisse.',
      loadingDescription:
        'Wir laden die neuesten Ergebnisse und bereiten die Fortschrittsübersicht vor.',
      loadingTitle: 'Ergebnisse werden geladen...',
      recentHeading: 'Letzte Spiele',
      relative: {
        daysAgo: 'vor {days} Tagen',
        noActivity: 'Keine Aktivität',
        today: 'Heute',
        yesterday: 'Gestern',
      },
      shared: {
        noData: 'Keine Daten',
        operationSummary: 'Durchschnitt {accuracy}% · Versuche {attempts} · +{xp} XP / Sitzung',
      },
      strongest: {
        empty: 'Nicht genug Daten, um eine Stärke zu erkennen.',
        label: 'Starke Seite',
      },
      summary: {
        averageAccuracy: 'Durchschn. Genauigkeit',
        perfectGames: 'Perfekte Ergebnisse',
        totalGames: 'Spiele insgesamt',
      },
      trend: {
        context: {
          down: 'Rückgang von {previous}% auf {recent}%.',
          flat: 'Stabil: {recent}% Woche zu Woche.',
          insufficient: 'Zum Vergleichen werden ältere Ergebnisse benötigt.',
          up: 'Anstieg von {previous}% auf {recent}%.',
        },
        label: 'Wochentrend',
        newRange: 'Neuer Bereich',
      },
      weakest: {
        empty: 'Wir brauchen mehr als einen Aufgabentyp, um einen Förderbereich zu erkennen.',
        label: 'Braucht Unterstützung',
        reviewLesson: 'Lektion wiederholen',
      },
      window: {
        lastActivityPrefix: 'Letzte Aktivität:',
        title: 'Überblick über die letzten {days} Tage',
        weeklySessions: 'Sitzungen dieser Woche',
        weeklySummary: 'Durchschnitt {accuracy}% · perfekt {perfect}',
        weeklyXp: 'XP: +{xp} · durchschnittlich {average} pro Sitzung',
      },
    };
  }

  if (locale === 'en') {
    return {
      byOperationHeading: 'Results by operation',
      emptyDescription: 'No saved scores.',
      loadingDescription: 'We are fetching the latest results and preparing the progress summary.',
      loadingTitle: 'Loading scores...',
      recentHeading: 'Recent games',
      relative: {
        daysAgo: '{days} days ago',
        noActivity: 'No activity',
        today: 'Today',
        yesterday: 'Yesterday',
      },
      shared: {
        noData: 'No data',
        operationSummary: 'Average {accuracy}% · attempts {attempts} · +{xp} XP / session',
      },
      strongest: {
        empty: 'Not enough data to identify a strength.',
        label: 'Strong area',
      },
      summary: {
        averageAccuracy: 'Avg. accuracy',
        perfectGames: 'Perfect scores',
        totalGames: 'Games total',
      },
      trend: {
        context: {
          down: 'Down from {previous}% to {recent}%.',
          flat: 'Stable: {recent}% week over week.',
          insufficient: 'We need older results to compare.',
          up: 'Up from {previous}% to {recent}%.',
        },
        label: 'Weekly trend',
        newRange: 'New range',
      },
      weakest: {
        empty: 'We need more than one task type to identify a support area.',
        label: 'Needs support',
        reviewLesson: 'Review lesson',
      },
      window: {
        lastActivityPrefix: 'Last activity:',
        title: 'Overview of the last {days} days',
        weeklySessions: 'Sessions this week',
        weeklySummary: 'Average {accuracy}% · perfect {perfect}',
        weeklyXp: 'XP: +{xp} · average {average} per session',
      },
    };
  }

  return {
    byOperationHeading: 'Wyniki wg operacji',
    emptyDescription: 'Brak zapisanych wyników.',
    loadingDescription: 'Pobieramy ostatnie wyniki i przygotowujemy podsumowanie postępu.',
    loadingTitle: 'Ładowanie wyników...',
    recentHeading: 'Ostatnie gry',
    relative: {
      daysAgo: '{days} dni temu',
      noActivity: 'Brak aktywności',
      today: 'Dzisiaj',
      yesterday: 'Wczoraj',
    },
    shared: {
      noData: 'Brak danych',
      operationSummary: 'Średnio {accuracy}% · próby {attempts} · +{xp} XP / sesję',
    },
    strongest: {
      empty: 'Za mało danych na wskazanie przewagi.',
      label: 'Mocna strona',
    },
    summary: {
      averageAccuracy: 'Śr. skuteczność',
      perfectGames: 'Idealne wyniki',
      totalGames: 'Gier łącznie',
    },
    trend: {
      context: {
        down: 'Spadek z {previous}% na {recent}%.',
        flat: 'Stabilnie: {recent}% tydzień do tygodnia.',
        insufficient: 'Potrzeba starszych wyników do porównania.',
        up: 'Wzrost z {previous}% na {recent}%.',
      },
      label: 'Trend tygodnia',
      newRange: 'Nowy zakres',
    },
    weakest: {
      empty: 'Potrzeba więcej niż jednego typu zadania, aby wskazać obszar do wsparcia.',
      label: 'Do wsparcia',
      reviewLesson: 'Powtórz lekcję',
    },
    window: {
      lastActivityPrefix: 'Ostatnia aktywność:',
      title: 'Obraz ostatnich {days} dni',
      weeklySessions: 'Sesje tygodnia',
      weeklySummary: 'Średnia {accuracy}% · idealne {perfect}',
      weeklyXp: 'XP: +{xp} · średnio {average} na sesję',
    },
  };
};

const interpolateScoreHistoryTemplate = (
  template: string,
  values?: TranslationValues
): string => {
  if (!values) {
    return template;
  }

  const interpolationValues: Record<string, unknown> = values;
  return template.replace(/\{(\w+)\}/g, (match: string, key: string) => {
    const value = interpolationValues[key];
    return value === undefined ? match : String(value);
  });
};

const translateScoreHistoryWithFallback = (
  translate: ((key: string, values?: TranslationValues) => string) | undefined,
  key: string,
  fallback: string,
  values?: TranslationValues
): string => {
  if (!translate) {
    return interpolateScoreHistoryTemplate(fallback, values);
  }

  const translated = translate(key, values);
  return interpolateScoreHistoryTemplate(
    translated === key || translated.endsWith(`.${key}`) ? fallback : translated,
    values
  );
};

const formatRelativeLastPlayed = (
  value: string | null,
  translate: ((key: string, values?: TranslationValues) => string) | undefined,
  fallbackCopy: ScoreHistoryFallbackCopy
): string => {
  if (!value) {
    return translateScoreHistoryWithFallback(
      translate,
      'relative.noActivity',
      fallbackCopy.relative.noActivity
    );
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return translateScoreHistoryWithFallback(
      translate,
      'relative.noActivity',
      fallbackCopy.relative.noActivity
    );
  }

  const today = new Date();
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const playedMidnight = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
  const diffDays = Math.round(
    (todayMidnight.getTime() - playedMidnight.getTime()) / (24 * 60 * 60 * 1000)
  );
  if (diffDays <= 0) {
    return translateScoreHistoryWithFallback(
      translate,
      'relative.today',
      fallbackCopy.relative.today
    );
  }
  if (diffDays === 1) {
    return translateScoreHistoryWithFallback(
      translate,
      'relative.yesterday',
      fallbackCopy.relative.yesterday
    );
  }
  return translateScoreHistoryWithFallback(
    translate,
    'relative.daysAgo',
    fallbackCopy.relative.daysAgo,
    { days: diffDays }
  );
};

const formatTrendValue = (
  deltaAccuracy: number | null,
  translate: ((key: string, values?: TranslationValues) => string) | undefined,
  fallbackCopy: ScoreHistoryFallbackCopy
): string => {
  if (deltaAccuracy === null) {
    return translateScoreHistoryWithFallback(
      translate,
      'trend.newRange',
      fallbackCopy.trend.newRange
    );
  }
  if (deltaAccuracy > 0) {
    return `+${deltaAccuracy} pp`;
  }
  return `${deltaAccuracy} pp`;
};

const formatTrendContext = (
  trend: ReturnType<typeof buildKangurScoreInsights>['trend'],
  translate: ((key: string, values?: TranslationValues) => string) | undefined,
  fallbackCopy: ScoreHistoryFallbackCopy
): string => {
  if (trend.previousAverageAccuracy === null) {
    return translateScoreHistoryWithFallback(
      translate,
      'trend.context.insufficient',
      fallbackCopy.trend.context.insufficient
    );
  }
  if (trend.direction === 'up') {
    return translateScoreHistoryWithFallback(
      translate,
      'trend.context.up',
      fallbackCopy.trend.context.up,
      {
        previous: trend.previousAverageAccuracy,
        recent: trend.recentAverageAccuracy,
      }
    );
  }
  if (trend.direction === 'down') {
    return translateScoreHistoryWithFallback(
      translate,
      'trend.context.down',
      fallbackCopy.trend.context.down,
      {
        previous: trend.previousAverageAccuracy,
        recent: trend.recentAverageAccuracy,
      }
    );
  }
  return translateScoreHistoryWithFallback(
    translate,
    'trend.context.flat',
    fallbackCopy.trend.context.flat,
    { recent: trend.recentAverageAccuracy }
  );
};

const buildLessonFocusHref = (basePath: string, operation: string): string =>
  appendKangurUrlParams(createPageUrl('Lessons', basePath), { focus: operation }, basePath);

const resolveOperationAccent = (operation: string): KangurAccent => OP_ACCENTS[operation] ?? 'slate';

const resolveAccuracyAccent = (percent: number): KangurAccent => {
  if (percent >= 90) {
    return 'emerald';
  }
  if (percent >= 70) {
    return 'amber';
  }
  return 'rose';
};

export default function ScoreHistory({
  learnerId = null,
  playerName = null,
  createdBy = null,
  basePath = null,
  prefetchedScores,
  prefetchedLoading,
}: ScoreHistoryProps): React.JSX.Element {
  const locale = useLocale();
  const normalizedLocale = normalizeSiteLocale(locale);
  const translations = useTranslations('KangurScoreHistory');
  const operationTranslations = useTranslations('KangurScoreHistory.operations');
  const fallbackCopy = useMemo(
    () => getScoreHistoryFallbackCopy(normalizedLocale),
    [normalizedLocale]
  );
  const isCoarsePointer = useKangurCoarsePointer();
  const { subject } = useKangurSubjectFocus();
  const [scores, setScores] = useState<KangurScoreRecord[]>([]);
  const [isInternalLoading, setIsInternalLoading] = useState(true);
  const usesPrefetchedScores =
    prefetchedScores !== undefined || prefetchedLoading !== undefined;
  const resolvedScores = prefetchedScores ?? scores;
  const loading = prefetchedLoading ?? isInternalLoading;
  const weakestLessonActionClassName = isCoarsePointer
    ? 'mt-3 w-full min-h-11 px-4 touch-manipulation select-none active:scale-[0.97] sm:w-auto'
    : 'mt-3 w-full sm:w-auto';

  useEffect(() => {
    if (usesPrefetchedScores) {
      return;
    }

    let isActive = true;

    const loadScores = async (): Promise<void> => {
      const normalizedLearnerId = learnerId?.trim() || '';
      const normalizedPlayerName = playerName?.trim() || '';
      const normalizedCreatedBy = createdBy?.trim() || '';
      if (isActive) {
        setIsInternalLoading(true);
      }

      try {
        const loadedScores = await withKangurClientError(
          {
            source: 'kangur.score-history',
            action: 'load-scores',
            description: 'Loads scoped Kangur scores for the learner history panel.',
            context: {
              learnerIdProvided: normalizedLearnerId.length > 0,
              playerNameProvided: normalizedPlayerName.length > 0,
              createdByProvided: normalizedCreatedBy.length > 0,
              subject,
            },
          },
          async () =>
            await loadScopedKangurScores(kangurPlatform.score, {
              learnerId: normalizedLearnerId,
              playerName: normalizedPlayerName,
              createdBy: normalizedCreatedBy,
              limit: SCORE_FETCH_LIMIT,
              fallbackToAll: true,
              subject,
            }),
          {
            fallback: [],
            shouldReport: (error) => !isRecoverableKangurClientFetchError(error),
            onError: () => {
              if (isActive) {
                setScores([]);
              }
            },
          }
        );
        if (!isActive) {
          return;
        }
        setScores(loadedScores);
      } finally {
        if (isActive) {
          setIsInternalLoading(false);
        }
      }
    };

    void loadScores();

    return () => {
      isActive = false;
    };
  }, [createdBy, learnerId, playerName, subject, usesPrefetchedScores]);

  const subjectScores = useMemo(
    () => resolvedScores.filter((score) => resolveKangurScoreSubject(score) === subject),
    [resolvedScores, subject]
  );
  const scoreInsightsLocalizer = useMemo(
    () => ({
      locale: normalizedLocale,
      translateOperationLabel: (operation: string, fallback: string) =>
        translateScoreHistoryWithFallback(operationTranslations, operation, fallback),
    }),
    [normalizedLocale, operationTranslations]
  );
  const insights = useMemo(
    () => buildKangurScoreInsights(subjectScores, new Date(), scoreInsightsLocalizer),
    [scoreInsightsLocalizer, subjectScores]
  );
  const weakestLessonHref =
    basePath && insights.weakestOperation
      ? buildLessonFocusHref(basePath, insights.weakestOperation.operation)
      : null;

  if (loading) {
    return (
      <KangurEmptyState
        accent='slate'
        align='center'
        data-testid='score-history-loading'
        description={translateScoreHistoryWithFallback(
          translations,
          'loading.description',
          fallbackCopy.loadingDescription
        )}
        padding='lg'
        title={translateScoreHistoryWithFallback(
          translations,
          'loading.title',
          fallbackCopy.loadingTitle
        )}
        role='status'
        aria-live='polite'
        aria-atomic='true'
      />
    );
  }

  if (subjectScores.length === 0) {
    return (
      <KangurEmptyState
        description={translateScoreHistoryWithFallback(
          translations,
          'empty.description',
          fallbackCopy.emptyDescription
        )}
        padding='lg'
      />
    );
  }

  const avgAccuracy = Math.round(
    subjectScores.reduce(
      (sum, score) => sum + (score.correct_answers / (score.total_questions || 10)) * 100,
      0
    ) / subjectScores.length
  );

  const opBreakdown: Record<string, OperationBreakdown> = {};
  for (const score of subjectScores) {
    const operationKey = score.operation;
    const existing = opBreakdown[operationKey] ?? { total: 0, correct: 0, count: 0 };
    existing.total += score.total_questions || 10;
    existing.correct += score.correct_answers || 0;
    existing.count += 1;
    opBreakdown[operationKey] = existing;
  }

  return (
    <div className={`flex flex-col ${KANGUR_PANEL_GAP_CLASSNAME}`}>
      <div className='grid grid-cols-1 kangur-panel-gap min-[420px]:grid-cols-2 md:grid-cols-3'>
        <KangurMetricCard
          accent='sky'
          align='center'
          data-testid='score-history-total-games'
          label={translateScoreHistoryWithFallback(
            translations,
            'summary.totalGames',
            fallbackCopy.summary.totalGames
          )}
          value={subjectScores.length}
        />
        <KangurMetricCard
          accent='emerald'
          align='center'
          data-testid='score-history-average-accuracy'
          label={translateScoreHistoryWithFallback(
            translations,
            'summary.averageAccuracy',
            fallbackCopy.summary.averageAccuracy
          )}
          value={`${avgAccuracy}%`}
        />
        <KangurMetricCard
          accent='amber'
          align='center'
          data-testid='score-history-perfect-games'
          label={translateScoreHistoryWithFallback(
            translations,
            'summary.perfectGames',
            fallbackCopy.summary.perfectGames
          )}
          value={
            subjectScores.filter((score) => score.correct_answers === score.total_questions).length
          }
        />
      </div>

      <KangurGlassPanel padding='md' surface='mistStrong' variant='soft'>
        <KangurPanelSectionHeading tone='slate'>
          {translateScoreHistoryWithFallback(
            translations,
            'window.title',
            fallbackCopy.window.title,
            { days: SCORE_INSIGHT_WINDOW_DAYS }
          )}
        </KangurPanelSectionHeading>
        <div className='grid grid-cols-1 kangur-panel-gap min-[420px]:grid-cols-2 xl:grid-cols-4'>
          <KangurMetricCard
            accent='sky'
            label={translateScoreHistoryWithFallback(
              translations,
              'window.weeklySessions',
              fallbackCopy.window.weeklySessions
            )}
            value={insights.recentGames}
          >
            <p className='text-xs text-sky-800/80'>
              {translateScoreHistoryWithFallback(
                translations,
                'window.weeklySummary',
                fallbackCopy.window.weeklySummary,
                {
                  accuracy: insights.recentAverageAccuracy,
                  perfect: insights.recentPerfectGames,
                }
              )}
            </p>
            <p className='mt-1 text-xs text-sky-800/80'>
              {translateScoreHistoryWithFallback(
                translations,
                'window.weeklyXp',
                fallbackCopy.window.weeklyXp,
                {
                  xp: insights.recentXpEarned,
                  average: insights.averageXpPerRecentGame,
                }
              )}
            </p>
            <p className='mt-2 text-[11px] text-sky-800/70'>
              {translateScoreHistoryWithFallback(
                translations,
                'window.lastActivityPrefix',
                fallbackCopy.window.lastActivityPrefix
              )}{' '}
              {formatRelativeLastPlayed(insights.lastPlayedAt, translations, fallbackCopy)}
            </p>
          </KangurMetricCard>

          <KangurMetricCard
            accent='violet'
            label={translateScoreHistoryWithFallback(
              translations,
              'trend.label',
              fallbackCopy.trend.label
            )}
            value={formatTrendValue(insights.trend.deltaAccuracy, translations, fallbackCopy)}
          >
            <p className='text-xs text-violet-800/80'>
              {formatTrendContext(insights.trend, translations, fallbackCopy)}
            </p>
          </KangurMetricCard>

          <KangurMetricCard
            accent='emerald'
            label={translateScoreHistoryWithFallback(
              translations,
              'strongest.label',
              fallbackCopy.strongest.label
            )}
            value={
              insights.strongestOperation
                ? `${insights.strongestOperation.emoji} ${insights.strongestOperation.label}`
                : translateScoreHistoryWithFallback(
                    translations,
                    'shared.noData',
                    fallbackCopy.shared.noData
                  )
            }
            valueClassName='text-base leading-tight sm:text-lg'
          >
            {insights.strongestOperation ? (
              <p className='text-xs text-emerald-800/80'>
                {translateScoreHistoryWithFallback(
                  translations,
                  'shared.operationSummary',
                  fallbackCopy.shared.operationSummary,
                  {
                    accuracy: insights.strongestOperation.averageAccuracy,
                    attempts: insights.strongestOperation.attempts,
                    xp: insights.strongestOperation.averageXpEarned,
                  }
                )}
              </p>
            ) : (
              <p className='text-sm text-emerald-800/80'>
                {translateScoreHistoryWithFallback(
                  translations,
                  'strongest.empty',
                  fallbackCopy.strongest.empty
                )}
              </p>
            )}
          </KangurMetricCard>

          <KangurMetricCard
            accent='rose'
            label={translateScoreHistoryWithFallback(
              translations,
              'weakest.label',
              fallbackCopy.weakest.label
            )}
            value={
              insights.weakestOperation
                ? `${insights.weakestOperation.emoji} ${insights.weakestOperation.label}`
                : translateScoreHistoryWithFallback(
                    translations,
                    'shared.noData',
                    fallbackCopy.shared.noData
                  )
            }
            valueClassName='text-base leading-tight sm:text-lg'
          >
            {insights.weakestOperation ? (
              <>
                <p className='text-xs text-rose-800/80'>
                  {translateScoreHistoryWithFallback(
                    translations,
                    'shared.operationSummary',
                    fallbackCopy.shared.operationSummary,
                    {
                      accuracy: insights.weakestOperation.averageAccuracy,
                      attempts: insights.weakestOperation.attempts,
                      xp: insights.weakestOperation.averageXpEarned,
                    }
                  )}
                </p>
                {weakestLessonHref && (
                  <KangurButton
                    asChild
                    className={weakestLessonActionClassName}
                    size='sm'
                    variant='surface'
                  >
                    <Link
                      href={weakestLessonHref}
                      targetPageKey='Lessons'
                      transitionSourceId='score-history:weakest-lesson'
                    >
                      {translateScoreHistoryWithFallback(
                        translations,
                        'weakest.reviewLesson',
                        fallbackCopy.weakest.reviewLesson
                      )}
                    </Link>
                  </KangurButton>
                )}
              </>
            ) : (
              <p className='text-sm text-rose-800/80'>
                {translateScoreHistoryWithFallback(
                  translations,
                  'weakest.empty',
                  fallbackCopy.weakest.empty
                )}
              </p>
            )}
          </KangurMetricCard>
        </div>
      </KangurGlassPanel>

      <KangurGlassPanel padding='md' surface='solid' variant='subtle'>
        <KangurPanelSectionHeading tone='slate'>
          {translateScoreHistoryWithFallback(
            translations,
            'byOperation.heading',
            fallbackCopy.byOperationHeading
          )}
        </KangurPanelSectionHeading>
        <div className={KANGUR_STACK_TIGHT_CLASSNAME}>
          {Object.entries(opBreakdown).map(([operation, data]) => {
            const percent = Math.round((data.correct / data.total) * 100);
            const info = resolveKangurScoreOperationInfo(operation, scoreInsightsLocalizer);
            const progressAccent = percent >= 80 ? 'emerald' : percent >= 50 ? 'amber' : 'rose';
            return (
              <div key={operation} className='flex items-start kangur-panel-gap sm:items-center'>
                <span className='text-lg w-6 text-center'>{info.emoji}</span>
                <div className='flex-1'>
                  <div className={`mb-0.5 ${KANGUR_STACK_COMPACT_CLASSNAME} text-xs text-slate-600 min-[420px]:flex-row min-[420px]:justify-between`}>
                    <span className='font-semibold'>{info.label}</span>
                    <span>
                      {data.correct}/{data.total} ({percent}%)
                    </span>
                  </div>
                  <KangurProgressBar
                    accent={progressAccent}
                    data-testid={`score-history-operation-progress-${operation}`}
                    size='sm'
                    value={percent}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </KangurGlassPanel>

      <KangurGlassPanel padding='md' surface='solid' variant='subtle'>
        <p className='mb-3 text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500'>
          {translateScoreHistoryWithFallback(
            translations,
            'recent.heading',
            fallbackCopy.recentHeading
          )}
        </p>
        <div className={`${KANGUR_STACK_TIGHT_CLASSNAME} max-h-64 overflow-y-auto`}>
          {subjectScores.map((score) => {
            const info = resolveKangurScoreOperationInfo(score.operation, scoreInsightsLocalizer);
            const percent = Math.round(
              ((score.correct_answers || 0) / (score.total_questions || 10)) * 100
            );
            const rowAccent = resolveOperationAccent(score.operation);
            return (
              <KangurSessionHistoryRow
                accent={rowAccent}
                dataTestId={`score-history-recent-row-${score.id}`}
                durationClassName='text-slate-400'
                durationText={score.time_taken > 0 ? `${score.time_taken}s` : undefined}
                icon={info.emoji}
                iconTestId={`score-history-recent-icon-${score.id}`}
                key={score.id}
                scoreAccent={resolveAccuracyAccent(percent)}
                scoreTestId={`score-history-recent-score-${score.id}`}
                scoreText={`${score.correct_answers}/${score.total_questions || 10}`}
                subtitle={new Date(score.created_date).toLocaleDateString(locale)}
                subtitleClassName='text-slate-400'
                title={info.label}
                titleClassName='text-sm font-semibold text-slate-700'
                xpTestId={`score-history-recent-xp-${score.id}`}
                xpText={
                  typeof score.xp_earned === 'number' && Number.isFinite(score.xp_earned)
                    ? `+${Math.max(0, Math.round(score.xp_earned))} XP`
                    : undefined
                }
              />
            );
          })}
        </div>
      </KangurGlassPanel>
    </div>
  );
}

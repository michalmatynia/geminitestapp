'use client';

import React from 'react';
import { KangurSessionHistoryRow } from '@/features/kangur/ui/components/KangurSessionHistoryRow';
import { KangurTransitionLink as Link } from '@/features/kangur/ui/components/KangurTransitionLink';
import {
  KangurButton,
  KangurEmptyState,
  KangurGlassPanel,
  KangurMetricCard,
  KangurProgressBar,
} from '@/features/kangur/ui/design/primitives';
import { cn } from '@/shared/utils';
import {
  KANGUR_PANEL_GAP_CLASSNAME,
  KANGUR_STACK_COMPACT_CLASSNAME,
} from '@/features/kangur/ui/design/tokens';
import { useKangurCoarsePointer } from '@/features/kangur/ui/hooks/useKangurCoarsePointer';
import {
  SCORE_INSIGHT_WINDOW_DAYS,
  resolveKangurScoreOperationInfo,
} from '@/features/kangur/ui/services/score-insights';

import type { ScoreHistoryProps } from './score-history/ScoreHistory.types';
import { useScoreHistoryState } from './score-history/ScoreHistory.hooks';
import {
  buildLessonFocusHref,
  formatRelativeLastPlayed,
  formatTrendContext,
  formatTrendValue,
  resolveAccuracyAccent,
  resolveOperationAccent,
  translateScoreHistoryWithFallback,
} from './score-history/ScoreHistory.utils';

function formatRecentSessionDate(
  value: string,
  locale: string,
  fallback: string
): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return fallback;
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(parsed);
}

function formatRecentSessionDuration(value: number | null | undefined): string | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    return undefined;
  }

  const totalSeconds = Math.max(0, Math.round(value));
  if (totalSeconds < 60) {
    return `${totalSeconds}s`;
  }

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return seconds === 0 ? `${minutes} min` : `${minutes} min ${seconds}s`;
}

function formatAverageXpPerSession(
  subjectScores: ReadonlyArray<{ xp_earned?: number | null | undefined }>
): number {
  if (subjectScores.length === 0) {
    return 0;
  }

  const totalXp = subjectScores.reduce(
    (sum, score) => sum + (typeof score.xp_earned === 'number' ? score.xp_earned : 0),
    0
  );

  return Math.round(totalXp / subjectScores.length);
}

type ScoreHistoryState = ReturnType<typeof useScoreHistoryState>;
type ScoreHistoryInsights = ScoreHistoryState['insights'];
type ScoreHistoryTranslations = ScoreHistoryState['translations'];
type ScoreHistoryFallbackCopy = ScoreHistoryState['fallbackCopy'];
type ScoreHistoryTranslateOperationLabel = ScoreHistoryState['translateOperationLabel'];
type ScoreHistoryOperationPerformanceEntry = ScoreHistoryInsights['operationPerformance'][number];
type ScoreHistoryRecentScoreEntry = ScoreHistoryState['subjectScores'][number];

const resolveWeakestLessonActionClassName = (isCoarsePointer: boolean): string =>
  isCoarsePointer
    ? 'mt-3 w-full min-h-11 px-4 touch-manipulation select-none active:scale-[0.97] sm:w-auto'
    : 'mt-3 w-full sm:w-auto';

const resolveScoreHistoryTrendAccent = (
  direction: ScoreHistoryInsights['trend']['direction']
): React.ComponentProps<typeof KangurMetricCard>['accent'] => {
  if (direction === 'up') {
    return 'emerald';
  }
  if (direction === 'down') {
    return 'rose';
  }
  return 'slate';
};

const resolveScoreHistoryAttemptLabel = (attempts: number): string =>
  attempts === 1 ? 'próba' : 'próby';

const resolveScoreHistoryAccuracyClassName = (accuracy: number): string =>
  cn('text-slate-900', accuracy >= 90 ? 'text-emerald-600' : accuracy < 70 ? 'text-rose-600' : null);

const resolveScoreHistoryXpText = (xpEarned: number | null): string | undefined =>
  xpEarned !== null ? `+${xpEarned} XP` : undefined;

function ScoreHistoryLastActivity(props: {
  fallbackCopy: ScoreHistoryFallbackCopy;
  insights: ScoreHistoryInsights;
  translations: ScoreHistoryTranslations;
}): React.JSX.Element | null {
  if (!props.insights.lastPlayedAt) {
    return null;
  }

  return (
    <div className='text-[10px] font-bold text-slate-400'>
      {translateScoreHistoryWithFallback(
        props.translations,
        'window.lastActivityPrefix',
        props.fallbackCopy.window.lastActivityPrefix
      )}{' '}
      <span className='text-slate-600'>
        {formatRelativeLastPlayed(props.insights.lastPlayedAt, props.translations, props.fallbackCopy)}
      </span>
    </div>
  );
}

function ScoreHistoryWindowHeader(props: {
  fallbackCopy: ScoreHistoryFallbackCopy;
  insights: ScoreHistoryInsights;
  translations: ScoreHistoryTranslations;
}): React.JSX.Element {
  return (
    <div className='flex items-center justify-between'>
      <h2 className='text-sm font-black uppercase tracking-widest text-slate-400'>
        {translateScoreHistoryWithFallback(
          props.translations,
          'window.title',
          props.fallbackCopy.window.title,
          { days: SCORE_INSIGHT_WINDOW_DAYS }
        )}
      </h2>
      <ScoreHistoryLastActivity {...props} />
    </div>
  );
}

function ScoreHistoryStrongestPanel(props: {
  fallbackCopy: ScoreHistoryFallbackCopy;
  insights: ScoreHistoryInsights;
  translations: ScoreHistoryTranslations;
}): React.JSX.Element {
  const strongest = props.insights.strongest;

  return (
    <div className={KANGUR_STACK_COMPACT_CLASSNAME}>
      <h3 className='text-xs font-black uppercase tracking-[0.18em] text-slate-400'>
        {translateScoreHistoryWithFallback(
          props.translations,
          'strongest.label',
          props.fallbackCopy.strongest.label
        )}
      </h3>
      <KangurGlassPanel className='flex flex-1 flex-col justify-center' padding='md' surface='solid' variant='soft'>
        {strongest ? (
          <div className='flex items-center gap-4'>
            <div className='flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-2xl'>
              {strongest.emoji}
            </div>
            <div className='flex-1 space-y-1'>
              <div className='text-sm font-black text-slate-900'>{strongest.label}</div>
              <p className='text-[11px] font-bold text-slate-500'>
                {translateScoreHistoryWithFallback(
                  props.translations,
                  'shared.operationSummary',
                  props.fallbackCopy.shared.operationSummary,
                  {
                    accuracy: strongest.averageAccuracy,
                    attempts: strongest.attempts,
                    xp: strongest.averageXpPerSession,
                  }
                )}
              </p>
            </div>
          </div>
        ) : (
          <div className='text-center text-xs font-semibold text-slate-400'>
            {props.fallbackCopy.strongest.empty}
          </div>
        )}
      </KangurGlassPanel>
    </div>
  );
}

function ScoreHistoryWeakestPanel(props: {
  actionClassName: string;
  basePath: string | undefined;
  fallbackCopy: ScoreHistoryFallbackCopy;
  insights: ScoreHistoryInsights;
  translations: ScoreHistoryTranslations;
}): React.JSX.Element {
  const weakest = props.insights.weakest;

  return (
    <div className={KANGUR_STACK_COMPACT_CLASSNAME}>
      <h3 className='text-xs font-black uppercase tracking-[0.18em] text-slate-400'>
        {translateScoreHistoryWithFallback(
          props.translations,
          'weakest.label',
          props.fallbackCopy.weakest.label
        )}
      </h3>
      <KangurGlassPanel className='flex flex-1 flex-col justify-center' padding='md' surface='solid' variant='soft'>
        {weakest ? (
          <div className='flex flex-wrap items-center justify-between gap-4'>
            <div className='flex items-center gap-4'>
              <div className='flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-2xl'>
                {weakest.emoji}
              </div>
              <div className='space-y-1'>
                <div className='text-sm font-black text-slate-900'>{weakest.label}</div>
                <p className='text-[11px] font-bold text-slate-500'>
                  {translateScoreHistoryWithFallback(
                    props.translations,
                    'shared.operationSummary',
                    props.fallbackCopy.shared.operationSummary,
                    {
                      accuracy: weakest.averageAccuracy,
                      attempts: weakest.attempts,
                      xp: weakest.averageXpPerSession,
                    }
                  )}
                </p>
              </div>
            </div>
            <Link
              href={buildLessonFocusHref(props.basePath ?? '', weakest.operation)}
              className={props.actionClassName}
            >
              <KangurButton variant='surface' size='sm' className='w-full'>
                {translateScoreHistoryWithFallback(
                  props.translations,
                  'weakest.reviewLesson',
                  props.fallbackCopy.weakest.reviewLesson
                )}
              </KangurButton>
            </Link>
          </div>
        ) : (
          <div className='text-center text-xs font-semibold text-slate-400'>
            {props.fallbackCopy.weakest.empty}
          </div>
        )}
      </KangurGlassPanel>
    </div>
  );
}

function ScoreHistoryOperationPerformanceCard(props: {
  entry: ScoreHistoryOperationPerformanceEntry;
}): React.JSX.Element {
  const { entry } = props;

  return (
    <KangurGlassPanel className='space-y-3' padding='md' surface='solid' variant='soft'>
      <div className='flex items-center justify-between gap-2'>
        <div className='flex items-center gap-2'>
          <span className='text-lg'>{entry.emoji}</span>
          <span className='text-xs font-black text-slate-900'>{entry.label}</span>
        </div>
        <div className='text-[10px] font-black text-slate-400 uppercase tracking-wider'>
          {entry.attempts} {resolveScoreHistoryAttemptLabel(entry.attempts)}
        </div>
      </div>
      <div className='space-y-1.5'>
        <div className='flex items-center justify-between text-[10px] font-bold'>
          <span className='text-slate-500'>Skuteczność</span>
          <span className={resolveScoreHistoryAccuracyClassName(entry.averageAccuracy)}>
            {entry.averageAccuracy}%
          </span>
        </div>
        <KangurProgressBar
          accent={resolveAccuracyAccent(entry.averageAccuracy)}
          data-testid={`score-history-operation-progress-${entry.operation}`}
          size='sm'
          value={entry.averageAccuracy}
        />
      </div>
    </KangurGlassPanel>
  );
}

function ScoreHistoryRecentSessionEntry(props: {
  fallbackCopy: ScoreHistoryFallbackCopy;
  normalizedLocale: string;
  score: ScoreHistoryRecentScoreEntry;
  translateOperationLabel: ScoreHistoryTranslateOperationLabel;
}): React.JSX.Element {
  const totalQuestions = Math.max(1, props.score.total_questions || 1);
  const accuracyPercent = Math.round((props.score.correct_answers / totalQuestions) * 100);
  const operationInfo = resolveKangurScoreOperationInfo(props.score.operation, {
    locale: props.normalizedLocale,
    translateOperationLabel: props.translateOperationLabel,
  });

  return (
    <KangurSessionHistoryRow
      accent={resolveOperationAccent(props.score.operation)}
      dataTestId={`score-history-recent-row-${props.score.id}`}
      durationClassName='text-slate-400'
      durationText={formatRecentSessionDuration(props.score.time_taken)}
      icon={operationInfo.emoji}
      scoreAccent={resolveAccuracyAccent(accuracyPercent)}
      scoreTestId={`score-history-recent-score-${props.score.id}`}
      scoreText={`${props.score.score}/${totalQuestions}`}
      subtitle={formatRecentSessionDate(
        props.score.created_date,
        props.normalizedLocale,
        props.fallbackCopy.relative.noActivity
      )}
      titleClassName='text-slate-700'
      title={operationInfo.label}
      xpTestId={`score-history-recent-xp-${props.score.id}`}
      xpText={resolveScoreHistoryXpText(props.score.xp_earned)}
    />
  );
}

export function ScoreHistory(props: ScoreHistoryProps): React.JSX.Element {
  const state = useScoreHistoryState(props);
  const {
    translations,
    fallbackCopy,
    loading,
    subjectScores,
    insights,
    normalizedLocale,
    translateOperationLabel,
  } = state;

  const isCoarsePointer = useKangurCoarsePointer();
  const weakestLessonActionClassName = resolveWeakestLessonActionClassName(isCoarsePointer);

  if (loading) {
    return (
      <KangurEmptyState
        accent='slate'
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
      />
    );
  }

  if (subjectScores.length === 0) {
    return (
      <KangurEmptyState
        accent='slate'
        description={translateScoreHistoryWithFallback(
          translations,
          'empty.description',
          fallbackCopy.emptyDescription
        )}
        padding='lg'
      />
    );
  }

  return (
    <div className={`flex flex-col ${KANGUR_PANEL_GAP_CLASSNAME}`}>
      <div className={KANGUR_STACK_COMPACT_CLASSNAME}>
        <ScoreHistoryWindowHeader
          fallbackCopy={fallbackCopy}
          insights={insights}
          translations={translations}
        />

        <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4'>
          <KangurMetricCard
            accent='slate'
            data-testid='score-history-total-games'
            label={translateScoreHistoryWithFallback(translations, 'summary.totalGames', fallbackCopy.summary.totalGames)}
            value={insights.summary.totalGames}
          />
          <KangurMetricCard
            accent='indigo'
            data-testid='score-history-average-accuracy'
            label={translateScoreHistoryWithFallback(translations, 'summary.averageAccuracy', fallbackCopy.summary.averageAccuracy)}
            value={`${insights.summary.averageAccuracy}%`}
          />
          <KangurMetricCard
            accent='emerald'
            data-testid='score-history-perfect-games'
            label={translateScoreHistoryWithFallback(translations, 'summary.perfectGames', fallbackCopy.summary.perfectGames)}
            value={insights.summary.perfectGames}
          />
          <KangurMetricCard
            accent={resolveScoreHistoryTrendAccent(insights.trend.direction)}
            data-testid='score-history-weekly-trend'
            label={translateScoreHistoryWithFallback(translations, 'trend.label', fallbackCopy.trend.label)}
            value={formatTrendValue(insights.trend.deltaAccuracy, translations, fallbackCopy)}
            description={formatTrendContext(insights.trend, translations, fallbackCopy)}
          />
        </div>
        <div className='grid grid-cols-1 gap-2 text-xs font-bold text-slate-500 sm:grid-cols-2'>
          <p>
            {translateScoreHistoryWithFallback(
              translations,
              'window.weeklySummary',
              fallbackCopy.window.weeklySummary,
              {
                accuracy: insights.summary.averageAccuracy,
                perfect: insights.summary.perfectGames,
              }
            )}
          </p>
          <p>
            {translateScoreHistoryWithFallback(
              translations,
              'window.weeklyXp',
              fallbackCopy.window.weeklyXp,
              {
                xp: subjectScores.reduce(
                  (sum, score) => sum + (typeof score.xp_earned === 'number' ? score.xp_earned : 0),
                  0
                ),
                average: formatAverageXpPerSession(subjectScores),
              }
            )}
          </p>
        </div>
      </div>

      <div className='grid grid-cols-1 gap-6 lg:grid-cols-2'>
        <ScoreHistoryStrongestPanel
          fallbackCopy={fallbackCopy}
          insights={insights}
          translations={translations}
        />
        <ScoreHistoryWeakestPanel
          actionClassName={weakestLessonActionClassName}
          basePath={props.basePath}
          fallbackCopy={fallbackCopy}
          insights={insights}
          translations={translations}
        />
      </div>

      <div className={KANGUR_STACK_COMPACT_CLASSNAME}>
        <h3 className='text-xs font-black uppercase tracking-[0.18em] text-slate-400'>
          {translateScoreHistoryWithFallback(
            translations,
            'byOperation.heading',
            fallbackCopy.byOperationHeading
          )}
        </h3>
        <div className='grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3'>
          {insights.operationPerformance.map((op) => (
            <ScoreHistoryOperationPerformanceCard key={op.operation} entry={op} />
          ))}
        </div>
      </div>

      <div className={KANGUR_STACK_COMPACT_CLASSNAME}>
        <h3 className='text-xs font-black uppercase tracking-[0.18em] text-slate-400'>
          {translateScoreHistoryWithFallback(
            translations,
            'recent.heading',
            fallbackCopy.recentHeading
          )}
        </h3>
        <div className='space-y-2'>
          {subjectScores.slice(0, 10).map((score) => (
            <ScoreHistoryRecentSessionEntry
              key={score.id}
              fallbackCopy={fallbackCopy}
              normalizedLocale={normalizedLocale}
              score={score}
              translateOperationLabel={translateOperationLabel}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default ScoreHistory;

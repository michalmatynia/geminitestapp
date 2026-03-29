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
  const weakestLessonActionClassName = isCoarsePointer
    ? 'mt-3 w-full min-h-11 px-4 touch-manipulation select-none active:scale-[0.97] sm:w-auto'
    : 'mt-3 w-full sm:w-auto';

  if (loading) {
    return (
      <KangurGlassPanel className='flex flex-col items-center justify-center p-12 text-center' surface='neutral' variant='soft'>
        <div className='text-lg font-black tracking-tight text-slate-900'>
          {translateScoreHistoryWithFallback(translations, 'loading.title', fallbackCopy.loadingTitle)}
        </div>
        <div className='mt-2 max-w-sm text-xs font-semibold text-slate-500'>
          {translateScoreHistoryWithFallback(
            translations,
            'loading.description',
            fallbackCopy.loadingDescription
          )}
        </div>
      </KangurGlassPanel>
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
        <div className='flex items-center justify-between'>
          <h2 className='text-sm font-black uppercase tracking-widest text-slate-400'>
            {translateScoreHistoryWithFallback(translations, 'window.title', fallbackCopy.window.title, { days: SCORE_INSIGHT_WINDOW_DAYS })}
          </h2>
          {insights.lastPlayedAt && (
            <div className='text-[10px] font-bold text-slate-400'>
              {translateScoreHistoryWithFallback(translations, 'window.lastActivityPrefix', fallbackCopy.window.lastActivityPrefix)}{' '}
              <span className='text-slate-600'>{formatRelativeLastPlayed(insights.lastPlayedAt, translations, fallbackCopy)}</span>
            </div>
          )}
        </div>

        <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4'>
          <KangurMetricCard
            accent='slate'
            label={translateScoreHistoryWithFallback(translations, 'summary.totalGames', fallbackCopy.summary.totalGames)}
            value={insights.summary.totalGames}
          />
          <KangurMetricCard
            accent='indigo'
            label={translateScoreHistoryWithFallback(translations, 'summary.averageAccuracy', fallbackCopy.summary.averageAccuracy)}
            value={`${insights.summary.averageAccuracy}%`}
          />
          <KangurMetricCard
            accent='emerald'
            label={translateScoreHistoryWithFallback(translations, 'summary.perfectGames', fallbackCopy.summary.perfectGames)}
            value={insights.summary.perfectGames}
          />
          <KangurMetricCard
            accent={insights.trend.direction === 'up' ? 'emerald' : insights.trend.direction === 'down' ? 'rose' : 'slate'}
            label={translateScoreHistoryWithFallback(translations, 'trend.label', fallbackCopy.trend.label)}
            value={formatTrendValue(insights.trend.deltaAccuracy, translations, fallbackCopy)}
            description={formatTrendContext(insights.trend, translations, fallbackCopy)}
          />
        </div>
      </div>

      <div className='grid grid-cols-1 gap-6 lg:grid-cols-2'>
        <div className={KANGUR_STACK_COMPACT_CLASSNAME}>
          <h3 className='text-xs font-black uppercase tracking-[0.18em] text-slate-400'>
            {translateScoreHistoryWithFallback(translations, 'strongest.label', fallbackCopy.strongest.label)}
          </h3>
          <KangurGlassPanel className='flex flex-1 flex-col justify-center' padding='md' surface='solid' variant='soft'>
            {insights.strongest ? (
              <div className='flex items-center gap-4'>
                <div className='flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-2xl'>{insights.strongest.emoji}</div>
                <div className='flex-1 space-y-1'>
                  <div className='text-sm font-black text-slate-900'>{insights.strongest.label}</div>
                  <div className='text-[11px] font-bold text-slate-500'>
                    {translateScoreHistoryWithFallback(translations, 'shared.operationSummary', fallbackCopy.shared.operationSummary, {
                      accuracy: insights.strongest.averageAccuracy,
                      attempts: insights.strongest.attempts,
                      xp: insights.strongest.averageXpPerSession,
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className='text-center text-xs font-semibold text-slate-400'>{fallbackCopy.strongest.empty}</div>
            )}
          </KangurGlassPanel>
        </div>

        <div className={KANGUR_STACK_COMPACT_CLASSNAME}>
          <h3 className='text-xs font-black uppercase tracking-[0.18em] text-slate-400'>
            {translateScoreHistoryWithFallback(translations, 'weakest.label', fallbackCopy.weakest.label)}
          </h3>
          <KangurGlassPanel className='flex flex-1 flex-col justify-center' padding='md' surface='solid' variant='soft'>
            {insights.weakest ? (
              <div className='flex flex-wrap items-center justify-between gap-4'>
                <div className='flex items-center gap-4'>
                  <div className='flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-2xl'>{insights.weakest.emoji}</div>
                  <div className='space-y-1'>
                    <div className='text-sm font-black text-slate-900'>{insights.weakest.label}</div>
                    <div className='text-[11px] font-bold text-slate-500'>
                      {translateScoreHistoryWithFallback(translations, 'shared.operationSummary', fallbackCopy.shared.operationSummary, {
                        accuracy: insights.weakest.averageAccuracy,
                        attempts: insights.weakest.attempts,
                        xp: insights.weakest.averageXpPerSession,
                      })}
                    </div>
                  </div>
                </div>
                <Link
                  href={buildLessonFocusHref(props.basePath ?? '', insights.weakest.operation)}
                  className={weakestLessonActionClassName}
                >
                  <KangurButton variant='surface' size='sm' className='w-full'>
                    {translateScoreHistoryWithFallback(translations, 'weakest.reviewLesson', fallbackCopy.weakest.reviewLesson)}
                  </KangurButton>
                </Link>
              </div>
            ) : (
              <div className='text-center text-xs font-semibold text-slate-400'>{fallbackCopy.weakest.empty}</div>
            )}
          </KangurGlassPanel>
        </div>
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
            <KangurGlassPanel key={op.operation} className='space-y-3' padding='md' surface='solid' variant='soft'>
              <div className='flex items-center justify-between gap-2'>
                <div className='flex items-center gap-2'>
                  <span className='text-lg'>{op.emoji}</span>
                  <span className='text-xs font-black text-slate-900'>{op.label}</span>
                </div>
                <div className='text-[10px] font-black text-slate-400 uppercase tracking-wider'>
                  {op.attempts} {op.attempts === 1 ? 'próba' : 'próby'}
                </div>
              </div>
              <div className='space-y-1.5'>
                <div className='flex items-center justify-between text-[10px] font-bold'>
                  <span className='text-slate-500'>Skuteczność</span>
                  <span className={cn('text-slate-900', op.averageAccuracy >= 90 ? 'text-emerald-600' : op.averageAccuracy < 70 ? 'text-rose-600' : null)}>
                    {op.averageAccuracy}%
                  </span>
                </div>
                <KangurProgressBar accent={resolveAccuracyAccent(op.averageAccuracy)} size='sm' value={op.averageAccuracy} />
              </div>
            </KangurGlassPanel>
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
          {subjectScores.slice(0, 10).map((score) => {
            const totalQuestions = Math.max(1, score.total_questions || 1);
            const accuracyPercent = Math.round((score.correct_answers / totalQuestions) * 100);
            const operationInfo = resolveKangurScoreOperationInfo(score.operation, {
              locale: normalizedLocale,
              translateOperationLabel,
            });

            return (
              <KangurSessionHistoryRow
                key={score.id}
                accent={resolveOperationAccent(score.operation)}
                dataTestId={`score-history-session-${score.id}`}
                durationText={formatRecentSessionDuration(score.time_taken)}
                icon={operationInfo.emoji}
                scoreAccent={resolveAccuracyAccent(accuracyPercent)}
                scoreText={`${score.score}/${totalQuestions}`}
                subtitle={formatRecentSessionDate(
                  score.created_date,
                  normalizedLocale,
                  fallbackCopy.relative.noActivity
                )}
                title={operationInfo.label}
                xpText={score.xp_earned !== null ? `+${score.xp_earned} XP` : undefined}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default ScoreHistory;

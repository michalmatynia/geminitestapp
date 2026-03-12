import { useEffect, useMemo, useState } from 'react';

import {
  appendKangurUrlParams,
  getKangurPageHref as createPageUrl,
} from '@/features/kangur/config/routing';
import { logKangurClientError } from '@/features/kangur/observability/client';
import { getKangurPlatform } from '@/features/kangur/services/kangur-platform';
import type { KangurScoreRecord } from '@/features/kangur/services/ports';
import { KangurSessionHistoryRow } from '@/features/kangur/ui/components/KangurSessionHistoryRow';
import { KangurTransitionLink as Link } from '@/features/kangur/ui/components/KangurTransitionLink';
import {
  KangurButton,
  KangurEmptyState,
  KangurGlassPanel,
  KangurMetricCard,
  KangurProgressBar,
  KangurSectionEyebrow,
} from '@/features/kangur/ui/design/primitives';
import type { KangurAccent } from '@/features/kangur/ui/design/tokens';
import { loadScopedKangurScores } from '@/features/kangur/ui/services/learner-profile-scores';
import {
  SCORE_INSIGHT_WINDOW_DAYS,
  buildKangurScoreInsights,
} from '@/features/kangur/ui/services/score-insights';

type OperationLabel = {
  label: string;
  emoji: string;
};

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
};

const OP_LABELS: Record<string, OperationLabel> = {
  addition: { label: 'Dodawanie', emoji: '➕' },
  subtraction: { label: 'Odejmowanie', emoji: '➖' },
  multiplication: { label: 'Mnozenie', emoji: '✖️' },
  division: { label: 'Dzielenie', emoji: '➗' },
  decimals: { label: 'Ulamki', emoji: '🔢' },
  powers: { label: 'Potegi', emoji: '⚡' },
  roots: { label: 'Pierwiastki', emoji: '√' },
  clock: { label: 'Zegar', emoji: '🕐' },
  calendar: { label: 'Kalendarz', emoji: '📅' },
  geometry: { label: 'Geometria', emoji: '🔷' },
  mixed: { label: 'Mieszane', emoji: '🎲' },
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
};

const kangurPlatform = getKangurPlatform();

const SCORE_FETCH_LIMIT = 30;
const formatRelativeLastPlayed = (value: string | null): string => {
  if (!value) {
    return 'Brak aktywności';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return 'Brak aktywności';
  }

  const today = new Date();
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const playedMidnight = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
  const diffDays = Math.round(
    (todayMidnight.getTime() - playedMidnight.getTime()) / (24 * 60 * 60 * 1000)
  );
  if (diffDays <= 0) {
    return 'Dzisiaj';
  }
  if (diffDays === 1) {
    return 'Wczoraj';
  }
  return `${diffDays} dni temu`;
};

const formatTrendValue = (deltaAccuracy: number | null): string => {
  if (deltaAccuracy === null) {
    return 'Nowy zakres';
  }
  if (deltaAccuracy > 0) {
    return `+${deltaAccuracy} pp`;
  }
  return `${deltaAccuracy} pp`;
};

const formatTrendContext = (
  trend: ReturnType<typeof buildKangurScoreInsights>['trend']
): string => {
  if (trend.previousAverageAccuracy === null) {
    return 'Potrzeba starszych wyników do porównania.';
  }
  if (trend.direction === 'up') {
    return `Wzrost z ${trend.previousAverageAccuracy}% na ${trend.recentAverageAccuracy}%.`;
  }
  if (trend.direction === 'down') {
    return `Spadek z ${trend.previousAverageAccuracy}% na ${trend.recentAverageAccuracy}%.`;
  }
  return `Stabilnie: ${trend.recentAverageAccuracy}% tydzień do tygodnia.`;
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
}: ScoreHistoryProps): React.JSX.Element {
  const [scores, setScores] = useState<KangurScoreRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isActive = true;

    const loadScores = async (): Promise<void> => {
      const normalizedLearnerId = learnerId?.trim() || '';
      const normalizedPlayerName = playerName?.trim() || '';
      const normalizedCreatedBy = createdBy?.trim() || '';
      if (isActive) {
        setLoading(true);
      }

      try {
        const loadedScores = await loadScopedKangurScores(kangurPlatform.score, {
          learnerId: normalizedLearnerId,
          playerName: normalizedPlayerName,
          createdBy: normalizedCreatedBy,
          limit: SCORE_FETCH_LIMIT,
          fallbackToAll: true,
        });
        if (!isActive) {
          return;
        }
        setScores(loadedScores);
      } catch (error: unknown) {
        if (!isActive) {
          return;
        }
        logKangurClientError(error, {
          source: 'KangurScoreHistory',
          action: 'loadScores',
          learnerIdProvided: normalizedLearnerId.length > 0,
          playerNameProvided: normalizedPlayerName.length > 0,
          createdByProvided: normalizedCreatedBy.length > 0,
        });
        setScores([]);
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    void loadScores();

    return () => {
      isActive = false;
    };
  }, [createdBy, learnerId, playerName]);

  const insights = useMemo(() => buildKangurScoreInsights(scores), [scores]);
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
        description='Pobieramy ostatnie wyniki i przygotowujemy podsumowanie postępu.'
        padding='lg'
        title='Ładowanie wyników...'
      />
    );
  }

  if (scores.length === 0) {
    return <KangurEmptyState description='Brak zapisanych wyników.' padding='lg' />;
  }

  const avgAccuracy = Math.round(
    scores.reduce(
      (sum, score) => sum + (score.correct_answers / (score.total_questions || 10)) * 100,
      0
    ) / scores.length
  );

  const opBreakdown: Record<string, OperationBreakdown> = {};
  for (const score of scores) {
    const operationKey = score.operation;
    const existing = opBreakdown[operationKey] ?? { total: 0, correct: 0, count: 0 };
    existing.total += score.total_questions || 10;
    existing.correct += score.correct_answers || 0;
    existing.count += 1;
    opBreakdown[operationKey] = existing;
  }

  return (
    <div className='flex flex-col gap-5'>
      <div className='grid grid-cols-1 gap-3 min-[360px]:grid-cols-2 md:grid-cols-3'>
        <KangurMetricCard
          accent='sky'
          align='center'
          data-testid='score-history-total-games'
          label='Gier łącznie'
          value={scores.length}
        />
        <KangurMetricCard
          accent='emerald'
          align='center'
          data-testid='score-history-average-accuracy'
          label='Śr. skuteczność'
          value={`${avgAccuracy}%`}
        />
        <KangurMetricCard
          accent='amber'
          align='center'
          data-testid='score-history-perfect-games'
          label='Idealne wyniki'
          value={scores.filter((score) => score.correct_answers === score.total_questions).length}
        />
      </div>

      <KangurGlassPanel padding='md' surface='mistStrong' variant='soft'>
        <KangurSectionEyebrow as='p' className='mb-3' tone='slate'>
          Obraz ostatnich {SCORE_INSIGHT_WINDOW_DAYS} dni
        </KangurSectionEyebrow>
        <div className='grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 xl:grid-cols-4'>
          <KangurMetricCard accent='sky' label='Sesje tygodnia' value={insights.recentGames}>
            <p className='text-xs text-sky-800/80'>
              Średnia {insights.recentAverageAccuracy}% · idealne {insights.recentPerfectGames}
            </p>
            <p className='mt-1 text-xs text-sky-800/80'>
              XP: +{insights.recentXpEarned} · średnio {insights.averageXpPerRecentGame} na sesję
            </p>
            <p className='mt-2 text-[11px] text-sky-800/70'>
              Ostatnia aktywność: {formatRelativeLastPlayed(insights.lastPlayedAt)}
            </p>
          </KangurMetricCard>

          <KangurMetricCard
            accent='violet'
            label='Trend tygodnia'
            value={formatTrendValue(insights.trend.deltaAccuracy)}
          >
            <p className='text-xs text-violet-800/80'>{formatTrendContext(insights.trend)}</p>
          </KangurMetricCard>

          <KangurMetricCard
            accent='emerald'
            label='Mocna strona'
            value={
              insights.strongestOperation
                ? `${insights.strongestOperation.emoji} ${insights.strongestOperation.label}`
                : 'Brak danych'
            }
            valueClassName='text-base leading-tight sm:text-lg'
          >
            {insights.strongestOperation ? (
              <p className='text-xs text-emerald-800/80'>
                Średnio {insights.strongestOperation.averageAccuracy}% · próby{' '}
                {insights.strongestOperation.attempts} · +{insights.strongestOperation.averageXpEarned} XP / sesję
              </p>
            ) : (
              <p className='text-sm text-emerald-800/80'>Za mało danych na wskazanie przewagi.</p>
            )}
          </KangurMetricCard>

          <KangurMetricCard
            accent='rose'
            label='Do wsparcia'
            value={
              insights.weakestOperation
                ? `${insights.weakestOperation.emoji} ${insights.weakestOperation.label}`
                : 'Brak danych'
            }
            valueClassName='text-base leading-tight sm:text-lg'
          >
            {insights.weakestOperation ? (
              <>
                <p className='text-xs text-rose-800/80'>
                  Średnio {insights.weakestOperation.averageAccuracy}% · próby{' '}
                  {insights.weakestOperation.attempts} · +{insights.weakestOperation.averageXpEarned} XP / sesję
                </p>
                {weakestLessonHref && (
                  <KangurButton asChild className='mt-3 w-full sm:w-auto' size='sm' variant='surface'>
                    <Link
                      href={weakestLessonHref}
                      targetPageKey='Lessons'
                      transitionAcknowledgeMs={110}
                      transitionSourceId='score-history:weakest-lesson'
                    >
                      Powtórz lekcję
                    </Link>
                  </KangurButton>
                )}
              </>
            ) : (
              <p className='text-sm text-rose-800/80'>
                Potrzeba więcej niż jednego typu zadania, aby wskazać obszar do wsparcia.
              </p>
            )}
          </KangurMetricCard>
        </div>
      </KangurGlassPanel>

      <KangurGlassPanel padding='md' surface='solid' variant='subtle'>
        <KangurSectionEyebrow as='p' className='mb-3' tone='slate'>
          Wyniki wg operacji
        </KangurSectionEyebrow>
        <div className='flex flex-col gap-2'>
          {Object.entries(opBreakdown).map(([operation, data]) => {
            const percent = Math.round((data.correct / data.total) * 100);
            const info = OP_LABELS[operation] ?? { label: operation, emoji: '❓' };
            const progressAccent = percent >= 80 ? 'emerald' : percent >= 50 ? 'amber' : 'rose';
            return (
              <div key={operation} className='flex items-start gap-3 sm:items-center'>
                <span className='text-lg w-6 text-center'>{info.emoji}</span>
                <div className='flex-1'>
                  <div className='mb-0.5 flex flex-col gap-1 text-xs text-slate-600 min-[420px]:flex-row min-[420px]:justify-between'>
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
          Ostatnie gry
        </p>
        <div className='flex flex-col gap-2 max-h-64 overflow-y-auto'>
          {scores.map((score) => {
            const info = OP_LABELS[score.operation] ?? { label: score.operation, emoji: '❓' };
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
                subtitle={new Date(score.created_date).toLocaleDateString('pl-PL')}
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

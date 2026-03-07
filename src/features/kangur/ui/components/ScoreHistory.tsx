import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import {
  appendKangurUrlParams,
  getKangurPageHref as createPageUrl,
} from '@/features/kangur/config/routing';
import { logKangurClientError } from '@/features/kangur/observability/client';
import { getKangurPlatform } from '@/features/kangur/services/kangur-platform';
import type { KangurScoreRecord } from '@/features/kangur/services/ports';
import {
  KangurButton,
  KangurEmptyState,
  KangurMetricCard,
  KangurPanel,
  KangurProgressBar,
} from '@/features/kangur/ui/design/primitives';
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
  mixed: { label: 'Mieszane', emoji: '🎲' },
};

const kangurPlatform = getKangurPlatform();

const SCORE_FETCH_LIMIT = 30;
const formatRelativeLastPlayed = (value: string | null): string => {
  if (!value) {
    return 'Brak aktywnosci';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return 'Brak aktywnosci';
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
    return 'Potrzeba starszych wynikow do porownania.';
  }
  if (trend.direction === 'up') {
    return `Wzrost z ${trend.previousAverageAccuracy}% na ${trend.recentAverageAccuracy}%.`;
  }
  if (trend.direction === 'down') {
    return `Spadek z ${trend.previousAverageAccuracy}% na ${trend.recentAverageAccuracy}%.`;
  }
  return `Stabilnie: ${trend.recentAverageAccuracy}% tydzien do tygodnia.`;
};

const buildLessonFocusHref = (basePath: string, operation: string): string =>
  appendKangurUrlParams(createPageUrl('Lessons', basePath), { focus: operation }, basePath);

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
      <KangurPanel className='py-8 text-center text-gray-400' padding='lg' variant='soft'>
        Ladowanie wynikow...
      </KangurPanel>
    );
  }

  if (scores.length === 0) {
    return <KangurEmptyState description='Brak zapisanych wynikow.' padding='lg' />;
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
      <div className='grid grid-cols-3 gap-3'>
        <KangurMetricCard
          accent='sky'
          align='center'
          data-testid='score-history-total-games'
          label='Gier lacznie'
          value={scores.length}
        />
        <KangurMetricCard
          accent='emerald'
          align='center'
          data-testid='score-history-average-accuracy'
          label='Sr. skutecznosc'
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

      <KangurPanel padding='md' variant='soft'>
        <p className='text-sm font-bold text-gray-500 uppercase tracking-wide mb-3'>
          Obraz ostatnich {SCORE_INSIGHT_WINDOW_DAYS} dni
        </p>
        <div className='grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3'>
          <KangurMetricCard accent='sky' label='Sesje tygodnia' value={insights.recentGames}>
            <p className='text-xs text-sky-800/80'>
              Srednia {insights.recentAverageAccuracy}% · idealne {insights.recentPerfectGames}
            </p>
            <p className='mt-2 text-[11px] text-sky-800/70'>
              Ostatnia aktywnosc: {formatRelativeLastPlayed(insights.lastPlayedAt)}
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
            valueClassName='text-lg leading-tight'
          >
            {insights.strongestOperation ? (
              <p className='text-xs text-emerald-800/80'>
                Srednio {insights.strongestOperation.averageAccuracy}% · proby{' '}
                {insights.strongestOperation.attempts}
              </p>
            ) : (
              <p className='text-sm text-emerald-800/80'>Za malo danych na wskazanie przewagi.</p>
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
            valueClassName='text-lg leading-tight'
          >
            {insights.weakestOperation ? (
              <>
                <p className='text-xs text-rose-800/80'>
                  Srednio {insights.weakestOperation.averageAccuracy}% · proby{' '}
                  {insights.weakestOperation.attempts}
                </p>
                {weakestLessonHref && (
                  <KangurButton asChild className='mt-3' size='sm' variant='secondary'>
                    <Link href={weakestLessonHref}>Powtorz lekcje</Link>
                  </KangurButton>
                )}
              </>
            ) : (
              <p className='text-sm text-rose-800/80'>
                Potrzeba wiecej niz jednego typu zadania, aby wskazac obszar do wsparcia.
              </p>
            )}
          </KangurMetricCard>
        </div>
      </KangurPanel>

      <KangurPanel padding='md' variant='soft'>
        <p className='text-sm font-bold text-gray-500 uppercase tracking-wide mb-3'>
          Wyniki wg operacji
        </p>
        <div className='flex flex-col gap-2'>
          {Object.entries(opBreakdown).map(([operation, data]) => {
            const percent = Math.round((data.correct / data.total) * 100);
            const info = OP_LABELS[operation] ?? { label: operation, emoji: '❓' };
            const progressAccent = percent >= 80 ? 'emerald' : percent >= 50 ? 'amber' : 'rose';
            return (
              <div key={operation} className='flex items-center gap-3'>
                <span className='text-lg w-6 text-center'>{info.emoji}</span>
                <div className='flex-1'>
                  <div className='flex justify-between text-xs text-gray-600 mb-0.5'>
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
      </KangurPanel>

      <KangurPanel padding='md' variant='soft'>
        <p className='text-sm font-bold text-gray-500 uppercase tracking-wide mb-3'>Ostatnie gry</p>
        <div className='flex flex-col gap-2 max-h-64 overflow-y-auto'>
          {scores.map((score) => {
            const info = OP_LABELS[score.operation] ?? { label: score.operation, emoji: '❓' };
            const percent = Math.round(
              ((score.correct_answers || 0) / (score.total_questions || 10)) * 100
            );
            return (
              <div
                key={score.id}
                className='flex items-center gap-3 border border-gray-100 rounded-xl px-3 py-2'
              >
                <span className='text-lg'>{info.emoji}</span>
                <div className='flex-1'>
                  <p className='text-sm font-semibold text-gray-700'>{info.label}</p>
                  <p className='text-xs text-gray-400'>
                    {new Date(score.created_date).toLocaleDateString('pl-PL')}
                  </p>
                </div>
                <div className='text-right'>
                  <p
                    className={`text-sm font-extrabold ${percent === 100 ? 'text-green-600' : percent >= 70 ? 'text-amber-600' : 'text-red-500'}`}
                  >
                    {score.correct_answers}/{score.total_questions || 10}
                  </p>
                  {score.time_taken > 0 && (
                    <p className='text-xs text-gray-400'>{score.time_taken}s</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </KangurPanel>
    </div>
  );
}

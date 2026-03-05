import { useEffect, useState } from 'react';

import { logKangurClientError } from '@/features/kangur/observability/client';
import { getKangurPlatform } from '@/features/kangur/services/kangur-platform';
import type { KangurScoreRecord } from '@/features/kangur/services/ports';

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
  playerName: string | null;
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

export default function ScoreHistory({ playerName }: ScoreHistoryProps): React.JSX.Element {
  const [scores, setScores] = useState<KangurScoreRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isActive = true;

    const loadScores = async (): Promise<void> => {
      try {
        const data = await kangurPlatform.score.filter(
          playerName ? { player_name: playerName } : {},
          '-created_date',
          30
        );
        if (!isActive) {
          return;
        }
        setScores(data);
      } catch (error: unknown) {
        if (!isActive) {
          return;
        }
        logKangurClientError(error, {
          source: 'KangurScoreHistory',
          action: 'loadScores',
          playerNameProvided: Boolean(playerName),
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
  }, [playerName]);

  if (loading) {
    return <div className='text-center text-gray-400 py-8'>Ladowanie wynikow...</div>;
  }

  if (scores.length === 0) {
    return <div className='text-center text-gray-400 py-8'>Brak zapisanych wynikow.</div>;
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
        <div className='bg-blue-50 rounded-2xl p-4 text-center'>
          <p className='text-3xl font-extrabold text-blue-600'>{scores.length}</p>
          <p className='text-xs text-gray-500 mt-0.5'>Gier lacznie</p>
        </div>
        <div className='bg-green-50 rounded-2xl p-4 text-center'>
          <p className='text-3xl font-extrabold text-green-600'>{avgAccuracy}%</p>
          <p className='text-xs text-gray-500 mt-0.5'>Sr. skutecznosc</p>
        </div>
        <div className='bg-amber-50 rounded-2xl p-4 text-center'>
          <p className='text-3xl font-extrabold text-amber-600'>
            {scores.filter((score) => score.correct_answers === score.total_questions).length}
          </p>
          <p className='text-xs text-gray-500 mt-0.5'>Idealne wyniki</p>
        </div>
      </div>

      <div className='bg-white rounded-2xl shadow p-4'>
        <p className='text-sm font-bold text-gray-500 uppercase tracking-wide mb-3'>
          Wyniki wg operacji
        </p>
        <div className='flex flex-col gap-2'>
          {Object.entries(opBreakdown).map(([operation, data]) => {
            const percent = Math.round((data.correct / data.total) * 100);
            const info = OP_LABELS[operation] ?? { label: operation, emoji: '❓' };
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
                  <div className='w-full h-2 bg-gray-100 rounded-full overflow-hidden'>
                    <div
                      style={{ width: `${percent}%` }}
                      className={`h-full rounded-full ${percent >= 80 ? 'bg-green-400' : percent >= 50 ? 'bg-amber-400' : 'bg-red-400'}`}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className='bg-white rounded-2xl shadow p-4'>
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
      </div>
    </div>
  );
}

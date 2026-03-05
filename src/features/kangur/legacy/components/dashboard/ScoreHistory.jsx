import { useEffect, useState } from 'react';
import { getKangurPlatform } from '@/features/kangur/services/kangur-platform';

const OP_LABELS = {
  addition: { label: 'Dodawanie', emoji: '➕' },
  subtraction: { label: 'Odejmowanie', emoji: '➖' },
  multiplication: { label: 'Mnożenie', emoji: '✖️' },
  division: { label: 'Dzielenie', emoji: '➗' },
  decimals: { label: 'Ułamki', emoji: '🔢' },
  powers: { label: 'Potęgi', emoji: '⚡' },
  roots: { label: 'Pierwiastki', emoji: '√' },
  clock: { label: 'Zegar', emoji: '🕐' },
  mixed: { label: 'Mieszane', emoji: '🎲' },
};
const kangurPlatform = getKangurPlatform();

export default function ScoreHistory({ playerName }) {
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    kangurPlatform.score.filter(
      playerName ? { player_name: playerName } : {},
      '-created_date',
      30
    ).then((data) => {
      setScores(data);
      setLoading(false);
    });
  }, [playerName]);

  if (loading) return <div className='text-center text-gray-400 py-8'>Ładowanie wyników...</div>;
  if (scores.length === 0)
    return <div className='text-center text-gray-400 py-8'>Brak zapisanych wyników.</div>;

  const avgAccuracy = scores.length
    ? Math.round(
        scores.reduce((s, r) => s + (r.correct_answers / (r.total_questions || 10)) * 100, 0) /
          scores.length
      )
    : 0;

  // Per-operation breakdown
  const opBreakdown = {};
  scores.forEach((s) => {
    if (!opBreakdown[s.operation]) opBreakdown[s.operation] = { total: 0, correct: 0, count: 0 };
    opBreakdown[s.operation].total += s.total_questions || 10;
    opBreakdown[s.operation].correct += s.correct_answers || 0;
    opBreakdown[s.operation].count += 1;
  });

  return (
    <div className='flex flex-col gap-5'>
      {/* Summary */}
      <div className='grid grid-cols-3 gap-3'>
        <div className='bg-blue-50 rounded-2xl p-4 text-center'>
          <p className='text-3xl font-extrabold text-blue-600'>{scores.length}</p>
          <p className='text-xs text-gray-500 mt-0.5'>Gier łącznie</p>
        </div>
        <div className='bg-green-50 rounded-2xl p-4 text-center'>
          <p className='text-3xl font-extrabold text-green-600'>{avgAccuracy}%</p>
          <p className='text-xs text-gray-500 mt-0.5'>Śr. skuteczność</p>
        </div>
        <div className='bg-amber-50 rounded-2xl p-4 text-center'>
          <p className='text-3xl font-extrabold text-amber-600'>
            {scores.filter((s) => s.correct_answers === s.total_questions).length}
          </p>
          <p className='text-xs text-gray-500 mt-0.5'>Idealne wyniki</p>
        </div>
      </div>

      {/* Per-operation breakdown */}
      <div className='bg-white rounded-2xl shadow p-4'>
        <p className='text-sm font-bold text-gray-500 uppercase tracking-wide mb-3'>
          Wyniki wg operacji
        </p>
        <div className='flex flex-col gap-2'>
          {Object.entries(opBreakdown).map(([op, data]) => {
            const pct = Math.round((data.correct / data.total) * 100);
            const info = OP_LABELS[op] || { label: op, emoji: '❓' };
            return (
              <div key={op} className='flex items-center gap-3'>
                <span className='text-lg w-6 text-center'>{info.emoji}</span>
                <div className='flex-1'>
                  <div className='flex justify-between text-xs text-gray-600 mb-0.5'>
                    <span className='font-semibold'>{info.label}</span>
                    <span>
                      {data.correct}/{data.total} ({pct}%)
                    </span>
                  </div>
                  <div className='w-full h-2 bg-gray-100 rounded-full overflow-hidden'>
                    <div
                      style={{ width: `${pct}%` }}
                      className={`h-full rounded-full ${pct >= 80 ? 'bg-green-400' : pct >= 50 ? 'bg-amber-400' : 'bg-red-400'}`}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent games list */}
      <div className='bg-white rounded-2xl shadow p-4'>
        <p className='text-sm font-bold text-gray-500 uppercase tracking-wide mb-3'>Ostatnie gry</p>
        <div className='flex flex-col gap-2 max-h-64 overflow-y-auto'>
          {scores.map((s) => {
            const info = OP_LABELS[s.operation] || { label: s.operation, emoji: '❓' };
            const pct = Math.round(((s.correct_answers || 0) / (s.total_questions || 10)) * 100);
            return (
              <div
                key={s.id}
                className='flex items-center gap-3 border border-gray-100 rounded-xl px-3 py-2'
              >
                <span className='text-lg'>{info.emoji}</span>
                <div className='flex-1'>
                  <p className='text-sm font-semibold text-gray-700'>{info.label}</p>
                  <p className='text-xs text-gray-400'>
                    {new Date(s.created_date).toLocaleDateString('pl-PL')}
                  </p>
                </div>
                <div className='text-right'>
                  <p
                    className={`text-sm font-extrabold ${pct === 100 ? 'text-green-600' : pct >= 70 ? 'text-amber-600' : 'text-red-500'}`}
                  >
                    {s.correct_answers}/{s.total_questions || 10}
                  </p>
                  {s.time_taken && <p className='text-xs text-gray-400'>{s.time_taken}s</p>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Trophy, User, Ghost } from 'lucide-react';

import { logKangurClientError } from '@/features/kangur/observability/client';
import { getKangurPlatform } from '@/features/kangur/services/kangur-platform';
import type { KangurScoreRecord, KangurUser } from '@/features/kangur/services/ports';
import { isKangurAuthStatusError } from '@/features/kangur/services/status-errors';

type OperationLabel = {
  label: string;
  emoji: string;
};

type UserFilter = 'all' | 'registered' | 'anonymous';

const OPERATION_LABELS: Record<string, OperationLabel> = {
  all: { label: 'Wszystkie', emoji: '🏆' },
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

const MEDALS = ['🥇', '🥈', '🥉'] as const;
const kangurPlatform = getKangurPlatform();

export default function Leaderboard(): React.JSX.Element {
  const [scores, setScores] = useState<KangurScoreRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [userFilter, setUserFilter] = useState<UserFilter>('all');
  const [currentUser, setCurrentUser] = useState<KangurUser | null>(null);

  useEffect(() => {
    let isActive = true;

    const loadScores = async (): Promise<void> => {
      try {
        const [userResult, scoreRows] = await Promise.allSettled([
          kangurPlatform.auth.me(),
          kangurPlatform.score.list('-score', 100),
        ]);

        if (!isActive) {
          return;
        }

        if (userResult.status === 'fulfilled') {
          setCurrentUser(userResult.value);
        } else {
          if (!isKangurAuthStatusError(userResult.reason)) {
            logKangurClientError(userResult.reason, {
              source: 'KangurLeaderboard',
              action: 'loadCurrentUser',
            });
          }
          setCurrentUser(null);
        }

        if (scoreRows.status === 'fulfilled') {
          setScores(scoreRows.value);
        } else {
          logKangurClientError(scoreRows.reason, {
            source: 'KangurLeaderboard',
            action: 'loadScores',
          });
          setScores([]);
        }
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
  }, []);

  const filtered = scores
    .filter((score) => {
      const operationMatch = filter === 'all' || score.operation === filter;
      const isRegistered = Boolean(score.created_by);
      const userMatch =
        userFilter === 'all' ||
        (userFilter === 'registered' && isRegistered) ||
        (userFilter === 'anonymous' && !isRegistered);
      return operationMatch && userMatch;
    })
    .slice(0, 10);

  return (
    <div className='bg-white rounded-3xl shadow-xl p-4 sm:p-6 w-full max-w-lg'>
      <div className='flex items-center gap-2 mb-4'>
        <Trophy className='text-yellow-400 w-6 h-6 flex-shrink-0' />
        <h3 className='text-xl font-extrabold text-gray-800'>Najlepsze wyniki</h3>
      </div>

      <div className='flex flex-col gap-2 mb-4'>
        <div className='flex flex-wrap gap-1'>
          {Object.entries(OPERATION_LABELS).map(([key, info]) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-2 py-1 rounded-xl text-xs font-semibold transition border ${
                filter === key
                  ? 'bg-indigo-500 text-white border-indigo-500'
                  : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-indigo-50'
              }`}
            >
              {info.emoji} {info.label}
            </button>
          ))}
        </div>

        <div className='flex gap-1'>
          {[
            { id: 'all' as const, label: 'Wszyscy', icon: null },
            { id: 'registered' as const, label: 'Zalogowani', icon: <User className='w-3 h-3' /> },
            { id: 'anonymous' as const, label: 'Anonimowi', icon: <Ghost className='w-3 h-3' /> },
          ].map((entry) => (
            <button
              key={entry.id}
              onClick={() => setUserFilter(entry.id)}
              className={`flex items-center gap-1 px-2 py-1 rounded-xl text-xs font-semibold transition border ${
                userFilter === entry.id
                  ? 'bg-purple-500 text-white border-purple-500'
                  : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-purple-50'
              }`}
            >
              {entry.icon}
              {entry.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className='text-center text-gray-400 py-6'>Ladowanie...</div>
      ) : filtered.length === 0 ? (
        <div className='text-center text-gray-400 py-6'>Brak wynikow dla tych filtrow.</div>
      ) : (
        <div className='flex flex-col gap-1'>
          {filtered.map((score, index) => {
            const isRegistered = Boolean(score.created_by);
            const isCurrentUser =
              Boolean(currentUser?.email) && score.created_by === (currentUser?.email ?? null);
            const operationInfo = OPERATION_LABELS[score.operation] ?? {
              emoji: '❓',
              label: score.operation,
            };

            return (
              <div
                key={score.id}
                className={`flex items-center gap-2 sm:gap-3 p-2 rounded-xl transition ${
                  isCurrentUser ? 'bg-indigo-50 border border-indigo-200' : 'hover:bg-gray-50'
                }`}
              >
                <span className='text-xl w-7 text-center flex-shrink-0'>
                  {index < 3 ? (
                    MEDALS[index]
                  ) : (
                    <span className='text-sm font-bold text-gray-400'>{index + 1}.</span>
                  )}
                </span>

                <div className='flex-1 min-w-0'>
                  <div className='flex items-center gap-1 flex-wrap'>
                    <span className='font-bold text-gray-700 truncate max-w-[120px] sm:max-w-none'>
                      {score.player_name}
                    </span>
                    {isRegistered ? (
                      <span title='Zalogowany' className='text-indigo-400'>
                        <User className='w-3 h-3' />
                      </span>
                    ) : (
                      <span title='Anonim' className='text-gray-300'>
                        <Ghost className='w-3 h-3' />
                      </span>
                    )}
                    {isCurrentUser && (
                      <span className='text-xs bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-full font-semibold'>
                        Ty
                      </span>
                    )}
                  </div>
                  <div className='text-xs text-gray-400'>
                    {operationInfo.emoji} {operationInfo.label}
                  </div>
                </div>

                <div className='text-right flex-shrink-0'>
                  <div className='font-extrabold text-indigo-600 text-sm sm:text-base'>
                    {score.score}/{score.total_questions}
                  </div>
                  <div className='text-xs text-gray-400'>{score.time_taken}s</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

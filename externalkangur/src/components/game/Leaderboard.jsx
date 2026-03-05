import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Trophy, User, Ghost } from 'lucide-react';

const OPERATION_LABELS = {
  all: { label: 'Wszystkie', emoji: '🏆' },
  addition: { label: 'Dodawanie', emoji: '➕' },
  subtraction: { label: 'Odejmowanie', emoji: '➖' },
  multiplication: { label: 'Mnożenie', emoji: '✖️' },
  division: { label: 'Dzielenie', emoji: '➗' },
  decimals: { label: 'Ułamki', emoji: '🔢' },
  powers: { label: 'Potęgi', emoji: '⚡' },
  roots: { label: 'Pierwiastki', emoji: '√' },
  mixed: { label: 'Mieszane', emoji: '🎲' },
};

const MEDALS = ['🥇', '🥈', '🥉'];

export default function Leaderboard() {
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [userFilter, setUserFilter] = useState('all'); // "all" | "registered" | "anonymous"
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    base44.auth
      .me()
      .then(setCurrentUser)
      .catch(() => {});
    base44.entities.Score.list('-score', 100).then((data) => {
      setScores(data);
      setLoading(false);
    });
  }, []);

  const filtered = scores
    .filter((s) => {
      const opMatch = filter === 'all' || s.operation === filter;
      const isRegistered = !!s.created_by;
      const userMatch =
        userFilter === 'all' ||
        (userFilter === 'registered' && isRegistered) ||
        (userFilter === 'anonymous' && !isRegistered);
      return opMatch && userMatch;
    })
    .slice(0, 10);

  return (
    <div className='bg-white rounded-3xl shadow-xl p-4 sm:p-6 w-full max-w-lg'>
      {/* Header */}
      <div className='flex items-center gap-2 mb-4'>
        <Trophy className='text-yellow-400 w-6 h-6 flex-shrink-0' />
        <h3 className='text-xl font-extrabold text-gray-800'>Najlepsze wyniki</h3>
      </div>

      {/* Filters */}
      <div className='flex flex-col gap-2 mb-4'>
        {/* Operation filter */}
        <div className='flex flex-wrap gap-1'>
          {Object.entries(OPERATION_LABELS).map(([key, { label, emoji }]) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-2 py-1 rounded-xl text-xs font-semibold transition border ${
                filter === key
                  ? 'bg-indigo-500 text-white border-indigo-500'
                  : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-indigo-50'
              }`}
            >
              {emoji} {label}
            </button>
          ))}
        </div>

        {/* User type filter */}
        <div className='flex gap-1'>
          {[
            { id: 'all', label: 'Wszyscy', icon: null },
            { id: 'registered', label: 'Zalogowani', icon: <User className='w-3 h-3' /> },
            { id: 'anonymous', label: 'Anonimowi', icon: <Ghost className='w-3 h-3' /> },
          ].map(({ id, label, icon }) => (
            <button
              key={id}
              onClick={() => setUserFilter(id)}
              className={`flex items-center gap-1 px-2 py-1 rounded-xl text-xs font-semibold transition border ${
                userFilter === id
                  ? 'bg-purple-500 text-white border-purple-500'
                  : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-purple-50'
              }`}
            >
              {icon}
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className='text-center text-gray-400 py-6'>Ładowanie...</div>
      ) : filtered.length === 0 ? (
        <div className='text-center text-gray-400 py-6'>Brak wyników dla tych filtrów.</div>
      ) : (
        <div className='flex flex-col gap-1'>
          {filtered.map((s, i) => {
            const isRegistered = !!s.created_by;
            const isMe = currentUser && s.created_by === currentUser.email;
            const opInfo = OPERATION_LABELS[s.operation] || { emoji: '❓', label: s.operation };
            return (
              <div
                key={s.id}
                className={`flex items-center gap-2 sm:gap-3 p-2 rounded-xl transition ${
                  isMe ? 'bg-indigo-50 border border-indigo-200' : 'hover:bg-gray-50'
                }`}
              >
                {/* Rank */}
                <span className='text-xl w-7 text-center flex-shrink-0'>
                  {i < 3 ? (
                    MEDALS[i]
                  ) : (
                    <span className='text-sm font-bold text-gray-400'>{i + 1}.</span>
                  )}
                </span>

                {/* Name + meta */}
                <div className='flex-1 min-w-0'>
                  <div className='flex items-center gap-1 flex-wrap'>
                    <span className='font-bold text-gray-700 truncate max-w-[120px] sm:max-w-none'>
                      {s.player_name}
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
                    {isMe && (
                      <span className='text-xs bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-full font-semibold'>
                        Ty
                      </span>
                    )}
                  </div>
                  <div className='text-xs text-gray-400'>
                    {opInfo.emoji} {opInfo.label}
                  </div>
                </div>

                {/* Score + time */}
                <div className='text-right flex-shrink-0'>
                  <div className='font-extrabold text-indigo-600 text-sm sm:text-base'>
                    {s.score}/{s.total_questions}
                  </div>
                  <div className='text-xs text-gray-400'>{s.time_taken}s</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

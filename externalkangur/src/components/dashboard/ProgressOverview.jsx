import { motion } from 'framer-motion';
import {
  LEVELS,
  BADGES,
  getCurrentLevel,
  getNextLevel,
} from '@/components/progress/progressSystem';

export default function ProgressOverview({ progress }) {
  const {
    totalXp,
    badges = [],
    gamesPlayed,
    lessonsCompleted,
    perfectGames,
    operationsPlayed = [],
  } = progress;
  const currentLevel = getCurrentLevel(totalXp);
  const nextLevel = getNextLevel(totalXp);
  const xpIntoLevel = totalXp - currentLevel.minXp;
  const xpNeeded = nextLevel ? nextLevel.minXp - currentLevel.minXp : 1;
  const pct = nextLevel ? Math.min(100, Math.round((xpIntoLevel / xpNeeded) * 100)) : 100;

  const stats = [
    { label: 'Łączne XP', value: totalXp, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'Poziom', value: currentLevel.level, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Rozegrane gry', value: gamesPlayed, color: 'text-blue-600', bg: 'bg-blue-50' },
    {
      label: 'Idealne wyniki',
      value: perfectGames || 0,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
    },
    {
      label: 'Ukończone lekcje',
      value: lessonsCompleted,
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
    { label: 'Zdobyte odznaki', value: badges.length, color: 'text-rose-600', bg: 'bg-rose-50' },
  ];

  return (
    <div className='flex flex-col gap-5'>
      {/* Level card */}
      <div className='bg-white rounded-2xl shadow p-5 flex items-center gap-4'>
        <div className='text-5xl'>🎖️</div>
        <div className='flex-1'>
          <p className={`font-extrabold text-xl ${currentLevel.color}`}>{currentLevel.title}</p>
          <p className='text-sm text-gray-400 mb-2'>
            Poziom {currentLevel.level} · {totalXp} XP łącznie
          </p>
          <div className='w-full h-3 bg-gray-100 rounded-full overflow-hidden'>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.8 }}
              className='h-full rounded-full bg-gradient-to-r from-indigo-400 to-purple-500'
            />
          </div>
          <p className='text-xs text-gray-400 mt-1'>
            {nextLevel
              ? `Do poziomu ${nextLevel.level}: ${xpNeeded - xpIntoLevel} XP`
              : 'Osiągnięto maksymalny poziom!'}
          </p>
        </div>
      </div>

      {/* Stats grid */}
      <div className='grid grid-cols-2 sm:grid-cols-3 gap-3'>
        {stats.map((s) => (
          <div key={s.label} className={`rounded-2xl ${s.bg} p-4 text-center`}>
            <p className={`text-3xl font-extrabold ${s.color}`}>{s.value}</p>
            <p className='text-xs text-gray-500 mt-0.5'>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Operations played */}
      {operationsPlayed.length > 0 && (
        <div className='bg-white rounded-2xl shadow p-4'>
          <p className='text-sm font-bold text-gray-500 uppercase tracking-wide mb-3'>
            Ćwiczone operacje
          </p>
          <div className='flex flex-wrap gap-2'>
            {operationsPlayed.map((op) => (
              <span
                key={op}
                className='bg-indigo-100 text-indigo-700 text-xs font-bold px-3 py-1 rounded-full capitalize'
              >
                {op}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Badges */}
      <div className='bg-white rounded-2xl shadow p-4'>
        <p className='text-sm font-bold text-gray-500 uppercase tracking-wide mb-3'>Odznaki</p>
        <div className='flex flex-wrap gap-2'>
          {BADGES.map((badge) => {
            const unlocked = badges.includes(badge.id);
            return (
              <div
                key={badge.id}
                title={badge.desc}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
                  unlocked
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'bg-gray-100 text-gray-300 opacity-50'
                }`}
              >
                <span className={unlocked ? '' : 'grayscale'}>{badge.emoji}</span>
                <span>{badge.name}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

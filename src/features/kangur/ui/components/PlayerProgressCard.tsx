import { motion } from 'framer-motion';

import { BADGES, getCurrentLevel, getNextLevel } from '@/features/kangur/ui/services/progress';
import type { KangurProgressState } from '@/features/kangur/ui/types';

type PlayerProgressCardProps = {
  progress: KangurProgressState;
};

export default function PlayerProgressCard({ progress }: PlayerProgressCardProps): React.JSX.Element {
  const { totalXp, badges, gamesPlayed, lessonsCompleted } = progress;
  const currentLevel = getCurrentLevel(totalXp);
  const nextLevel = getNextLevel(totalXp);
  const xpIntoLevel = totalXp - currentLevel.minXp;
  const xpNeeded = nextLevel ? nextLevel.minXp - currentLevel.minXp : 1;
  const percent = nextLevel ? Math.min(100, Math.round((xpIntoLevel / xpNeeded) * 100)) : 100;
  const unlockedBadges = BADGES.filter((badge) => badges.includes(badge.id));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className='bg-white rounded-3xl shadow-xl p-6 w-full max-w-sm flex flex-col gap-4'
    >
      <div className='flex items-center gap-3'>
        <div className='text-4xl'>🎖️</div>
        <div className='flex-1'>
          <p className={`font-extrabold text-lg leading-tight ${currentLevel.color}`}>
            {currentLevel.title}
          </p>
          <p className='text-xs text-gray-400'>
            Poziom {currentLevel.level} · {totalXp} XP lacznie
          </p>
        </div>
      </div>

      <div>
        <div className='flex justify-between text-xs text-gray-400 mb-1'>
          <span>{xpIntoLevel} XP</span>
          {nextLevel ? (
            <span>
              do poz. {nextLevel.level}: {xpNeeded - xpIntoLevel} XP
            </span>
          ) : (
            <span>Maksymalny poziom!</span>
          )}
        </div>
        <div className='w-full h-3 bg-gray-100 rounded-full overflow-hidden'>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${percent}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className='h-full rounded-full bg-gradient-to-r from-indigo-400 to-purple-500'
          />
        </div>
      </div>

      <div className='flex gap-3 justify-around text-center'>
        <div>
          <p className='text-2xl font-extrabold text-indigo-600'>{gamesPlayed}</p>
          <p className='text-xs text-gray-400'>Gier</p>
        </div>
        <div>
          <p className='text-2xl font-extrabold text-purple-600'>{lessonsCompleted}</p>
          <p className='text-xs text-gray-400'>Lekcji</p>
        </div>
        <div>
          <p className='text-2xl font-extrabold text-amber-500'>{unlockedBadges.length}</p>
          <p className='text-xs text-gray-400'>Odznak</p>
        </div>
      </div>

      <div>
        <p className='text-xs font-bold text-gray-400 uppercase tracking-wide mb-2'>Odznaki</p>
        <div className='flex flex-wrap gap-2'>
          {BADGES.map((badge) => {
            const unlocked = badges.includes(badge.id);
            return (
              <div
                key={badge.id}
                title={`${badge.name}: ${badge.desc}`}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${
                  unlocked
                    ? 'bg-indigo-100 text-indigo-700 shadow-sm'
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
    </motion.div>
  );
}

import { motion } from 'framer-motion';

import {
  KangurDisplayEmoji,
  KangurGlassPanel,
  KangurMetricCard,
  KangurProgressBar,
  KangurStatusChip,
} from '@/features/kangur/ui/design/primitives';
import { BADGES, getCurrentLevel, getNextLevel } from '@/features/kangur/ui/services/progress';
import type { KangurProgressState } from '@/features/kangur/ui/types';

type PlayerProgressCardProps = {
  progress: KangurProgressState;
};

export default function PlayerProgressCard({
  progress,
}: PlayerProgressCardProps): React.JSX.Element {
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
      className='w-full max-w-sm'
    >
      <KangurGlassPanel
        className='flex flex-col gap-4 shadow-[0_18px_40px_-30px_rgba(168,175,216,0.2)]'
        data-testid='player-progress-shell'
        padding='lg'
        surface='solid'
        variant='soft'
      >
        <div className='flex items-center gap-3'>
          <KangurDisplayEmoji size='sm'>🎖️</KangurDisplayEmoji>
          <div className='flex-1'>
            <p className={`font-extrabold text-lg leading-tight ${currentLevel.color}`}>
              {currentLevel.title}
            </p>
            <p className='text-xs text-slate-500'>
              Poziom {currentLevel.level} · {totalXp} XP lacznie
            </p>
          </div>
        </div>

        <div>
          <div className='mb-1 flex justify-between text-xs text-slate-500'>
            <span>{xpIntoLevel} XP</span>
            {nextLevel ? (
              <span>
                do poz. {nextLevel.level}: {xpNeeded - xpIntoLevel} XP
              </span>
            ) : (
              <span>Maksymalny poziom!</span>
            )}
          </div>
          <KangurProgressBar
            accent='indigo'
            animated
            data-testid='player-progress-level-bar'
            size='md'
            value={percent}
          />
        </div>

        <div className='grid grid-cols-3 gap-3'>
          <KangurMetricCard accent='indigo' align='center' label='Gier' value={gamesPlayed} />
          <KangurMetricCard
            accent='violet'
            align='center'
            label='Lekcji'
            value={lessonsCompleted}
          />
          <KangurMetricCard
            accent='amber'
            align='center'
            label='Odznak'
            value={unlockedBadges.length}
          />
        </div>

        <div>
          <p className='mb-2 text-xs font-bold uppercase tracking-wide text-slate-500'>Odznaki</p>
          <div className='flex flex-wrap gap-2'>
            {BADGES.map((badge) => {
              const unlocked = badges.includes(badge.id);
              return (
                <KangurStatusChip
                  key={badge.id}
                  accent={unlocked ? 'amber' : 'slate'}
                  className={unlocked ? 'gap-1.5' : 'gap-1.5 opacity-70'}
                  data-testid={`player-progress-badge-${badge.id}`}
                  title={`${badge.name}: ${badge.desc}`}
                >
                  <span className={unlocked ? '' : 'grayscale'}>{badge.emoji}</span>
                  <span>{badge.name}</span>
                </KangurStatusChip>
              );
            })}
          </div>
        </div>
      </KangurGlassPanel>
    </motion.div>
  );
}

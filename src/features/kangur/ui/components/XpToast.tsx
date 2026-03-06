import { AnimatePresence, motion } from 'framer-motion';

import { KangurLessonChip } from '@/features/kangur/ui/design/lesson-primitives';
import { KangurPanel } from '@/features/kangur/ui/design/primitives';
import { BADGES } from '@/features/kangur/ui/services/progress';
import type { KangurXpToastState } from '@/features/kangur/ui/types';

type XpToastProps = KangurXpToastState;

export default function XpToast({ xpGained, newBadges, visible }: XpToastProps): React.JSX.Element {
  const badgeDetails = (newBadges ?? [])
    .map((badgeId) => BADGES.find((badge) => badge.id === badgeId))
    .filter((badge): badge is (typeof BADGES)[number] => Boolean(badge));

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -40, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -30, scale: 0.9 }}
          className='fixed top-20 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2 pointer-events-none'
        >
          {xpGained > 0 && (
            <KangurPanel
              className='border-indigo-200/80 bg-white/96'
              padding='md'
              variant='elevated'
            >
              <div className='flex items-center gap-3'>
                <KangurLessonChip accent='indigo' className='text-sm font-bold'>
                  +{xpGained} XP
                </KangurLessonChip>
                <span className='text-sm font-bold text-slate-900'>Świetnie, zdobywasz kolejne punkty</span>
              </div>
            </KangurPanel>
          )}
          {badgeDetails.map((badge) => (
            <KangurPanel
              key={badge.id}
              className='border-amber-200/80 bg-white/96'
              padding='md'
              variant='elevated'
            >
              <div className='flex items-center gap-3'>
                <KangurLessonChip accent='amber' className='text-sm font-bold'>
                  {badge.emoji} Nowa odznaka
                </KangurLessonChip>
                <span className='text-sm font-bold text-slate-900'>{badge.name}</span>
              </div>
            </KangurPanel>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

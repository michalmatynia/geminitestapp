import { AnimatePresence, motion } from 'framer-motion';

import { BADGES } from '@/features/kangur/ui/services/progress';
import type { KangurXpToastState } from '@/features/kangur/ui/types';

type XpToastProps = KangurXpToastState;

export default function XpToast({
  xpGained,
  newBadges,
  visible,
}: XpToastProps): React.JSX.Element {
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
            <div className='bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-extrabold px-6 py-2.5 rounded-full shadow-xl text-lg'>
              +{xpGained} XP ✨
            </div>
          )}
          {badgeDetails.map((badge) => (
            <div
              key={badge.id}
              className='bg-amber-400 text-white font-bold px-5 py-2 rounded-full shadow-lg text-sm flex items-center gap-2'
            >
              {badge.emoji} Nowa odznaka: {badge.name}!
            </div>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

import { AnimatePresence, motion } from 'framer-motion';

import {
  KangurStatusChip,
  KangurSurfacePanel,
} from '@/features/kangur/ui/design/primitives';
import { useOptionalKangurRouting } from '@/features/kangur/ui/context/KangurRoutingContext';
import { BADGES } from '@/features/kangur/ui/services/progress';
import type { KangurXpToastState } from '@/features/kangur/ui/types';
import { cn } from '@/shared/utils';

type XpToastProps = KangurXpToastState;

export default function XpToast({ xpGained, newBadges, visible }: XpToastProps): React.JSX.Element {
  const routing = useOptionalKangurRouting();
  const embedded = routing?.embedded ?? false;
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
          role='status'
          aria-live='polite'
          aria-atomic='true'
          className={cn(
            'left-1/2 z-50 flex flex-col items-center gap-2 -translate-x-1/2 pointer-events-none',
            embedded ? 'absolute top-6' : 'fixed top-20'
          )}
        >
          {xpGained > 0 && (
            <KangurSurfacePanel
              accent='indigo'
              data-testid='xp-toast-xp-shell'
              padding='md'
            >
              <div className='flex items-center gap-3'>
                <KangurStatusChip accent='indigo' className='text-sm font-bold'>
                  +{xpGained} XP
                </KangurStatusChip>
                <span className='text-sm font-bold text-slate-900'>
                  Świetnie, zdobywasz kolejne punkty
                </span>
              </div>
            </KangurSurfacePanel>
          )}
          {badgeDetails.map((badge) => (
            <KangurSurfacePanel
              accent='amber'
              data-testid={`xp-toast-badge-shell-${badge.id}`}
              key={badge.id}
              padding='md'
            >
              <div className='flex items-center gap-3'>
                <KangurStatusChip accent='amber' className='text-sm font-bold'>
                  {badge.emoji} Nowa odznaka
                </KangurStatusChip>
                <span className='text-sm font-bold text-slate-900'>{badge.name}</span>
              </div>
            </KangurSurfacePanel>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

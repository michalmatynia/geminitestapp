import React from 'react';
import { motion } from 'framer-motion';
import { KangurMetricCard } from '@/features/kangur/ui/design/primitives';
import { useTranslations } from 'next-intl';

export function MultiplicationArrayCounters({
  collectedCount,
  total,
}: {
  collectedCount: number;
  total: number;
}): React.JSX.Element {
  const translations = useTranslations('KangurMiniGames');

  return (
    <div className='flex w-full flex-col gap-2 min-[420px]:flex-row min-[420px]:items-center'>
      <KangurMetricCard
        accent='violet'
        align='center'
        className='min-w-0 min-[420px]:min-w-[110px]'
        data-testid='multiplication-array-counter-collected'
        label={translations('multiplicationArray.inRound.collectedLabel')}
        padding='sm'
        value={
          <motion.span
            key={collectedCount}
            animate={{ scale: 1 }}
            initial={{ scale: 1.4 }}
            transition={{ duration: 0.25 }}
          >
            {collectedCount}
          </motion.span>
        }
      />
      <div className='hidden text-2xl font-bold [color:var(--kangur-page-muted-text)] min-[420px]:block'>
        /
      </div>
      <KangurMetricCard
        accent='slate'
        align='center'
        className='min-w-0 min-[420px]:min-w-[110px]'
        data-testid='multiplication-array-counter-target'
        label={translations('multiplicationArray.inRound.targetLabel')}
        padding='sm'
        value={total}
      />
    </div>
  );
}

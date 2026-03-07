'use client';

import {
  KangurPanel,
  KangurProgressBar,
} from '@/features/kangur/ui/design/primitives';
import { useKangurLearnerProfileRuntime } from '@/features/kangur/ui/context/KangurLearnerProfileRuntimeContext';

export function KangurLearnerProfileLevelProgressWidget(): React.JSX.Element {
  const { snapshot, xpToNextLevel } = useKangurLearnerProfileRuntime();

  return (
    <KangurPanel className='flex flex-col gap-4' padding='xl' variant='elevated'>
      <div className='flex flex-col gap-4 md:flex-row md:items-end md:justify-between'>
        <div>
          <div className={`text-2xl font-extrabold ${snapshot.level.color}`}>
            {snapshot.level.title}
          </div>
          <p className='text-sm text-slate-500'>
            Poziom {snapshot.level.level} · {snapshot.totalXp} XP lacznie
          </p>
        </div>
        <div className='text-sm text-slate-500'>
          {snapshot.nextLevel
            ? `Do poziomu ${snapshot.nextLevel.level}: ${xpToNextLevel} XP`
            : 'Maksymalny poziom osiagniety'}
        </div>
      </div>

      <div>
        <KangurProgressBar
          accent='indigo'
          data-testid='learner-profile-level-progress-bar'
          size='md'
          value={snapshot.levelProgressPercent}
        />
        <div className='mt-1 text-right text-xs text-slate-500'>
          {snapshot.levelProgressPercent}%
        </div>
      </div>
    </KangurPanel>
  );
}

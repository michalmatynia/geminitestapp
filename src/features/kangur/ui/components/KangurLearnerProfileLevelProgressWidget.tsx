'use client';

import { useKangurLearnerProfileRuntime } from '@/features/kangur/ui/context/KangurLearnerProfileRuntimeContext';
import {
  KangurGlassPanel,
  KangurProgressBar,
  KangurSectionEyebrow,
} from '@/features/kangur/ui/design/primitives';
import { useKangurPageContentEntry } from '@/features/kangur/ui/hooks/useKangurPageContent';

export function KangurLearnerProfileLevelProgressWidget(): React.JSX.Element {
  const { snapshot, xpToNextLevel } = useKangurLearnerProfileRuntime();
  const { entry: levelProgressContent } = useKangurPageContentEntry('learner-profile-level-progress');
  const sectionTitle = levelProgressContent?.title ?? 'Postep poziomu';
  const sectionSummary =
    levelProgressContent?.summary ??
    'Zobacz aktualny poziom, laczne XP i brakujacy dystans do nastepnego progu.';

  return (
    <KangurGlassPanel
      className='flex flex-col gap-4'
      padding='xl'
      surface='mistStrong'
      variant='soft'
    >
      <div className='flex flex-col gap-4 md:flex-row md:items-end md:justify-between'>
        <div>
          <KangurSectionEyebrow>
            {sectionTitle}
          </KangurSectionEyebrow>
          <div className={`mt-1 text-2xl font-extrabold ${snapshot.level.color}`}>
            {snapshot.level.title}
          </div>
          <p className='mt-1 text-sm [color:var(--kangur-page-muted-text)]'>
            {sectionSummary}
          </p>
          <p className='mt-1 text-sm [color:var(--kangur-page-muted-text)]'>
            Poziom {snapshot.level.level} · {snapshot.totalXp} XP lacznie
          </p>
        </div>
        <div className='text-sm [color:var(--kangur-page-muted-text)]'>
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
        <div className='mt-1 text-right text-xs [color:var(--kangur-page-muted-text)]'>
          {snapshot.levelProgressPercent}%
        </div>
      </div>
    </KangurGlassPanel>
  );
}

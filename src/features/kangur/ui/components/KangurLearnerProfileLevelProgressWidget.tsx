'use client';

import { useKangurLearnerProfileRuntime } from '@/features/kangur/ui/context/KangurLearnerProfileRuntimeContext';
import {
  KangurGlassPanel,
  KangurPanelIntro,
  KangurProgressBar,
} from '@/features/kangur/ui/design/primitives';
import { useKangurPageContentEntry } from '@/features/kangur/ui/hooks/useKangurPageContent';

export function KangurLearnerProfileLevelProgressWidget(): React.JSX.Element {
  const { snapshot, xpToNextLevel } = useKangurLearnerProfileRuntime();
  const { entry: levelProgressContent } = useKangurPageContentEntry('learner-profile-level-progress');
  const sectionTitle = levelProgressContent?.title ?? 'Postęp poziomu';
  const sectionSummary =
    levelProgressContent?.summary ??
    'Zobacz aktualny poziom, łączne XP i brakujący dystans do następnego progu.';

  return (
    <KangurGlassPanel
      className='flex flex-col gap-4'
      padding='xl'
      surface='mistStrong'
      variant='soft'
    >
      <div className='flex flex-col gap-4 md:flex-row md:items-end md:justify-between'>
        <KangurPanelIntro
          description={
            <>
              <p>{sectionSummary}</p>
              <p>
                Poziom {snapshot.level.level} · {snapshot.totalXp} XP łącznie
              </p>
            </>
          }
          descriptionClassName='mt-1 space-y-1'
          eyebrow={sectionTitle}
          title={snapshot.level.title}
          titleClassName={`mt-1 text-2xl font-extrabold ${snapshot.level.color}`}
        />
        <div className='text-sm [color:var(--kangur-page-muted-text)]'>
          {snapshot.nextLevel
            ? `Do poziomu ${snapshot.nextLevel.level}: ${xpToNextLevel} XP`
            : 'Maksymalny poziom osiągnięty'}
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

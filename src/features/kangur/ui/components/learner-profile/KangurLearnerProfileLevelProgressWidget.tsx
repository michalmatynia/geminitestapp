'use client';

import { useTranslations } from 'next-intl';
import { useKangurLearnerProfileRuntime } from '@/features/kangur/ui/context/KangurLearnerProfileRuntimeContext';
import {
  KangurGlassPanel,
  KangurPanelIntro,
  KangurProgressBar,
} from '@/features/kangur/ui/design/primitives';
import { KANGUR_PANEL_GAP_CLASSNAME, KANGUR_PANEL_ROW_MD_CLASSNAME } from '@/features/kangur/ui/design/tokens';
import { useKangurPageContentEntry } from '@/features/kangur/ui/hooks/useKangurPageContent';

export function KangurLearnerProfileLevelProgressWidget(): React.JSX.Element {
  const translations = useTranslations('KangurLearnerProfileWidgets.levelProgress');
  const { snapshot, xpToNextLevel } = useKangurLearnerProfileRuntime();
  const { entry: levelProgressContent } = useKangurPageContentEntry('learner-profile-level-progress');
  const sectionTitle = levelProgressContent?.title ?? translations('title');
  const sectionSummary =
    levelProgressContent?.summary ??
    translations('summary');

  return (
    <KangurGlassPanel
      className={`flex flex-col ${KANGUR_PANEL_GAP_CLASSNAME}`}
      padding='xl'
      surface='mistStrong'
      variant='soft'
    >
      <div className={`${KANGUR_PANEL_ROW_MD_CLASSNAME} md:items-end md:justify-between`}>
        <KangurPanelIntro
          className='min-w-0 flex-1'
          description={
            <>
              <p>{sectionSummary}</p>
              <p>
                {translations('totalXpLine', {
                  level: snapshot.level.level,
                  xp: snapshot.totalXp,
                })}
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
            ? translations('xpToNextLevel', {
              level: snapshot.nextLevel.level,
              xp: xpToNextLevel,
            })
            : translations('maxLevelReached')}
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

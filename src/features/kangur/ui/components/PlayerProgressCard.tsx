import { motion } from 'framer-motion';

import { KangurActivitySummaryCard } from '@/features/kangur/ui/components/KangurActivitySummaryCard';
import { KangurBadgeTrackSection } from '@/features/kangur/ui/components/KangurBadgeTrackSection';
import {
  KangurProgressHighlightCardContent,
  KangurProgressHighlightHeader,
  KangurProgressHighlightChip,
  KangurProgressHighlightBar,
} from '@/features/kangur/ui/components/KangurProgressHighlightCardContent';
import {
  KangurCardDescription,
  KangurCardTitle,
  KangurDisplayEmoji,
  KangurGlassPanel,
  KangurMetaText,
  KangurMetricCard,
  KangurProgressBar,
  KangurSectionEyebrow,
} from '@/features/kangur/ui/design/primitives';
import { KANGUR_PANEL_GAP_CLASSNAME } from '@/features/kangur/ui/design/tokens';
import {
  getCurrentLevel,
  getNextLevel,
  getNextLockedBadge,
  getProgressAverageAccuracy,
  getProgressAverageXpPerSession,
  getProgressTopActivities,
  getRecommendedSessionMomentum,
} from '@/features/kangur/ui/services/progress';
import { useKangurPageContentEntry } from '@/features/kangur/ui/hooks/useKangurPageContent';
import type { KangurProgressState } from '@/features/kangur/ui/types';

type PlayerProgressCardProps = {
  progress: KangurProgressState;
};

export default function PlayerProgressCard({
  progress,
}: PlayerProgressCardProps): React.JSX.Element {
  const { entry: progressContent } = useKangurPageContentEntry('game-home-progress');
  const badgeTrackProgress = progress;
  const { totalXp, gamesPlayed, lessonsCompleted } = progress;
  const currentLevel = getCurrentLevel(totalXp);
  const nextLevel = getNextLevel(totalXp);
  const xpIntoLevel = totalXp - currentLevel.minXp;
  const xpNeeded = nextLevel ? nextLevel.minXp - currentLevel.minXp : 1;
  const percent = nextLevel ? Math.min(100, Math.round((xpIntoLevel / xpNeeded) * 100)) : 100;
  const averageAccuracy = getProgressAverageAccuracy(progress);
  const averageXpPerSession = getProgressAverageXpPerSession(progress);
  const bestWinStreak = progress.bestWinStreak ?? 0;
  const topActivity = getProgressTopActivities(progress, 1)[0] ?? null;
  const nextBadge = getNextLockedBadge(progress);
  const guidedMomentum = getRecommendedSessionMomentum(progress);
  const progressTitle = progressContent?.title ?? 'Postępy ucznia';
  const progressSummary =
    progressContent?.summary ??
    'Zobacz poziom, serię, skuteczność i najbliższe odznaki w jednym miejscu.';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className='w-full max-w-sm'
    >
      <KangurGlassPanel
        className={`flex flex-col ${KANGUR_PANEL_GAP_CLASSNAME} shadow-[0_18px_40px_-30px_rgba(168,175,216,0.2)]`}
        data-testid='player-progress-shell'
        padding='lg'
        surface='solid'
        variant='soft'
      >
        <div className='space-y-2' data-testid='player-progress-copy'>
          <KangurSectionEyebrow as='p' className='tracking-[0.18em]'>
            {progressTitle}
          </KangurSectionEyebrow>
          <KangurCardDescription as='p' size='xs'>
            {progressSummary}
          </KangurCardDescription>
        </div>

        <div className='flex items-start kangur-panel-gap sm:items-center'>
          <KangurDisplayEmoji size='sm'>🎖️</KangurDisplayEmoji>
          <div className='min-w-0 flex-1'>
            <KangurCardTitle as='p' className={currentLevel.color} size='lg'>
              {currentLevel.title}
            </KangurCardTitle>
            <KangurMetaText as='p' size='xs'>
              Poziom {currentLevel.level} · {totalXp} XP łącznie
            </KangurMetaText>
          </div>
        </div>

        <div>
          <KangurMetaText
            as='div'
            className='mb-1 flex flex-col gap-1 min-[360px]:flex-row min-[360px]:items-center min-[360px]:justify-between'
            size='xs'
          >
            <span>{xpIntoLevel} XP</span>
            {nextLevel ? (
              <span>
                do poz. {nextLevel.level}: {xpNeeded - xpIntoLevel} XP
              </span>
            ) : (
              <span>Maksymalny poziom!</span>
            )}
          </KangurMetaText>
          <KangurProgressBar
            accent='indigo'
            animated
            data-testid='player-progress-level-bar'
            size='md'
            value={percent}
          />
        </div>

        <div className='grid grid-cols-1 kangur-panel-gap min-[360px]:grid-cols-2'>
          <KangurMetricCard accent='indigo' align='center' label='Gier' value={gamesPlayed} />
          <KangurMetricCard
            accent='violet'
            align='center'
            label='Lekcji'
            value={lessonsCompleted}
          />
          <KangurMetricCard
            accent='emerald'
            align='center'
            label='Skuteczność'
            value={`${averageAccuracy}%`}
          />
          <KangurMetricCard
            accent='amber'
            align='center'
            label='Seria'
            value={bestWinStreak}
          />
          <KangurMetricCard
            accent='sky'
            align='center'
            label='XP / grę'
            value={averageXpPerSession}
          />
        </div>

        {topActivity && (
          <KangurActivitySummaryCard
            activity={topActivity}
            dataTestId='player-progress-top-activity'
            description={`${topActivity.sessionsPlayed} sesji · ${topActivity.averageXpPerSession} XP / grę`}
            eyebrow='Najczęściej ćwiczysz'
          />
        )}

        {nextBadge ? (
          <div
            className='rounded-[28px] border border-amber-200/80 px-4 py-4'
            data-testid='player-progress-next-badge'
            style={{
              background:
                'color-mix(in srgb, var(--kangur-soft-card-background) 82%, #fde68a)',
            }}
          >
            <KangurProgressHighlightCardContent>
              <div className='flex flex-col items-start kangur-panel-gap sm:flex-row sm:justify-between'>
                <KangurProgressHighlightHeader
                  description={nextBadge.desc}
                  eyebrow='Następna odznaka'
                  eyebrowClassName='text-amber-700/80'
                  title={
                    <>
                      {nextBadge.emoji} {nextBadge.name}
                    </>
                  }
                />
                <KangurProgressHighlightChip accent='amber' label={nextBadge.summary} />
              </div>
              <KangurProgressHighlightBar
                accent='amber'
                testId='player-progress-next-badge-bar'
                value={nextBadge.progressPercent}
              />
            </KangurProgressHighlightCardContent>
          </div>
        ) : null}

        {guidedMomentum.completedSessions > 0 ? (
          <div
            className='rounded-[28px] border border-sky-200/80 px-4 py-4'
            data-testid='player-progress-guided-momentum'
            style={{
              background:
                'color-mix(in srgb, var(--kangur-soft-card-background) 82%, #dbeafe)',
            }}
          >
            <KangurProgressHighlightCardContent>
              <div className='flex flex-col items-start kangur-panel-gap sm:flex-row sm:justify-between'>
                <KangurProgressHighlightHeader
                  description={
                    guidedMomentum.nextBadgeName
                      ? `Do odznaki ${guidedMomentum.nextBadgeName}: ${guidedMomentum.summary}`
                      : 'Wszystkie odznaki polecanego kierunku odblokowane.'
                  }
                  eyebrow='Polecony kierunek'
                  eyebrowClassName='text-sky-700/80'
                  title={`${guidedMomentum.completedSessions} polecone rundy`}
                />
                <KangurProgressHighlightChip accent='sky' label={guidedMomentum.summary} />
              </div>
              <KangurProgressHighlightBar
                accent='sky'
                testId='player-progress-guided-momentum-bar'
                value={guidedMomentum.progressPercent}
              />
            </KangurProgressHighlightCardContent>
          </div>
        ) : null}

        <KangurBadgeTrackSection
          dataTestIdPrefix='player-progress-badge-track'
          emptyTestId='player-progress-badges-empty'
          headingClassName='mb-2 text-xs tracking-wide'
          progress={badgeTrackProgress}
        />
      </KangurGlassPanel>
    </motion.div>
  );
}

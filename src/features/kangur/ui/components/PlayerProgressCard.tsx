import { motion } from 'framer-motion';

import KangurBadgeTrackGrid from '@/features/kangur/ui/components/KangurBadgeTrackGrid';
import {
  KangurCardDescription,
  KangurCardTitle,
  KangurDisplayEmoji,
  KangurGlassPanel,
  KangurMetaText,
  KangurMetricCard,
  KangurProgressBar,
  KangurSectionEyebrow,
  KangurStatusChip,
} from '@/features/kangur/ui/design/primitives';
import {
  getCurrentLevel,
  getNextLevel,
  getNextLockedBadge,
  getProgressAverageAccuracy,
  getProgressAverageXpPerSession,
  getProgressTopActivities,
  getRecommendedSessionMomentum,
} from '@/features/kangur/ui/services/progress';
import type { KangurProgressState } from '@/features/kangur/ui/types';

type PlayerProgressCardProps = {
  progress: KangurProgressState;
};

export default function PlayerProgressCard({
  progress,
}: PlayerProgressCardProps): React.JSX.Element {
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
            <KangurCardTitle as='p' className={currentLevel.color} size='lg'>
              {currentLevel.title}
            </KangurCardTitle>
            <KangurMetaText as='p' size='xs'>
              Poziom {currentLevel.level} · {totalXp} XP lacznie
            </KangurMetaText>
          </div>
        </div>

        <div>
          <KangurMetaText as='div' className='mb-1 flex justify-between' size='xs'>
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

        <div className='grid grid-cols-2 gap-3'>
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
            label='Skutecznosc'
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
            label='XP / gre'
            value={averageXpPerSession}
          />
        </div>

        {topActivity && (
          <div
            className='soft-card flex items-center justify-between gap-3 rounded-3xl border [border-color:var(--kangur-soft-card-border)] px-4 py-3'
            data-testid='player-progress-top-activity'
          >
            <div>
              <KangurSectionEyebrow as='p' className='tracking-[0.18em]'>
                Najczesciej cwiczysz
              </KangurSectionEyebrow>
              <KangurCardTitle as='p'>
                {topActivity.label}
              </KangurCardTitle>
              <KangurCardDescription as='p' size='xs'>
                {topActivity.sessionsPlayed} sesji · {topActivity.averageXpPerSession} XP / gre
              </KangurCardDescription>
            </div>
            <KangurStatusChip accent='indigo'>{topActivity.totalXpEarned} XP</KangurStatusChip>
          </div>
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
            <div className='flex items-start justify-between gap-3'>
              <div>
                <KangurSectionEyebrow
                  as='p'
                  className='tracking-[0.18em] text-amber-700/80'
                >
                  Nastepna odznaka
                </KangurSectionEyebrow>
                <KangurCardTitle as='p' className='mt-1'>
                  {nextBadge.emoji} {nextBadge.name}
                </KangurCardTitle>
                <KangurCardDescription as='p' className='mt-1 leading-5' size='xs'>
                  {nextBadge.desc}
                </KangurCardDescription>
              </div>
              <KangurStatusChip accent='amber' className='shrink-0'>
                {nextBadge.summary}
              </KangurStatusChip>
            </div>
            <KangurProgressBar
              accent='amber'
              className='mt-3'
              data-testid='player-progress-next-badge-bar'
              size='sm'
              value={nextBadge.progressPercent}
            />
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
            <div className='flex items-start justify-between gap-3'>
              <div>
                <KangurSectionEyebrow
                  as='p'
                  className='tracking-[0.18em] text-sky-700/80'
                >
                  Polecony kierunek
                </KangurSectionEyebrow>
                <KangurCardTitle as='p' className='mt-1'>
                  {guidedMomentum.completedSessions} polecone rundy
                </KangurCardTitle>
                <KangurCardDescription as='p' className='mt-1 leading-5' size='xs'>
                  {guidedMomentum.nextBadgeName
                    ? `Do odznaki ${guidedMomentum.nextBadgeName}: ${guidedMomentum.summary}`
                    : 'Wszystkie odznaki polecanego kierunku odblokowane.'}
                </KangurCardDescription>
              </div>
              <KangurStatusChip accent='sky' className='shrink-0'>
                {guidedMomentum.summary}
              </KangurStatusChip>
            </div>
            <KangurProgressBar
              accent='sky'
              className='mt-3'
              data-testid='player-progress-guided-momentum-bar'
              size='sm'
              value={guidedMomentum.progressPercent}
            />
          </div>
        ) : null}

        <div>
          <KangurSectionEyebrow as='p' className='mb-2 text-xs tracking-wide'>
            Sciezki odznak
          </KangurSectionEyebrow>
          <KangurBadgeTrackGrid
            dataTestIdPrefix='player-progress-badge-track'
            emptyTestId='player-progress-badges-empty'
            progress={badgeTrackProgress}
          />
        </div>
      </KangurGlassPanel>
    </motion.div>
  );
}

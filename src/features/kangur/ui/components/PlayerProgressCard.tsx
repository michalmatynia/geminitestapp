import { motion } from 'framer-motion';

import KangurBadgeTrackGrid from '@/features/kangur/ui/components/KangurBadgeTrackGrid';
import {
  KangurDisplayEmoji,
  KangurGlassPanel,
  KangurMetricCard,
  KangurProgressBar,
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
            <p className={`font-extrabold text-lg leading-tight ${currentLevel.color}`}>
              {currentLevel.title}
            </p>
            <p className='text-xs text-slate-500'>
              Poziom {currentLevel.level} · {totalXp} XP lacznie
            </p>
          </div>
        </div>

        <div>
          <div className='mb-1 flex justify-between text-xs text-slate-500'>
            <span>{xpIntoLevel} XP</span>
            {nextLevel ? (
              <span>
                do poz. {nextLevel.level}: {xpNeeded - xpIntoLevel} XP
              </span>
            ) : (
              <span>Maksymalny poziom!</span>
            )}
          </div>
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
            className='soft-card flex items-center justify-between gap-3 rounded-3xl border border-slate-200/80 px-4 py-3'
            data-testid='player-progress-top-activity'
          >
            <div>
              <p className='text-[11px] font-bold uppercase tracking-[0.18em] [color:var(--kangur-page-muted-text)]'>
                Najczesciej cwiczysz
              </p>
              <p className='text-sm font-semibold [color:var(--kangur-page-text)]'>
                {topActivity.label}
              </p>
              <p className='text-xs [color:var(--kangur-page-muted-text)]'>
                {topActivity.sessionsPlayed} sesji · {topActivity.averageXpPerSession} XP / gre
              </p>
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
                <p className='text-[11px] font-bold uppercase tracking-[0.18em] text-amber-700/80'>
                  Nastepna odznaka
                </p>
                <p className='mt-1 text-sm font-semibold [color:var(--kangur-page-text)]'>
                  {nextBadge.emoji} {nextBadge.name}
                </p>
                <p className='mt-1 text-xs leading-5 [color:var(--kangur-page-muted-text)]'>
                  {nextBadge.desc}
                </p>
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
                <p className='text-[11px] font-bold uppercase tracking-[0.18em] text-sky-700/80'>
                  Polecony kierunek
                </p>
                <p className='mt-1 text-sm font-semibold [color:var(--kangur-page-text)]'>
                  {guidedMomentum.completedSessions} polecone rundy
                </p>
                <p className='mt-1 text-xs leading-5 [color:var(--kangur-page-muted-text)]'>
                  {guidedMomentum.nextBadgeName
                    ? `Do odznaki ${guidedMomentum.nextBadgeName}: ${guidedMomentum.summary}`
                    : 'Wszystkie odznaki polecanego kierunku odblokowane.'}
                </p>
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
          <p className='mb-2 text-xs font-bold uppercase tracking-wide [color:var(--kangur-page-muted-text)]'>
            Sciezki odznak
          </p>
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

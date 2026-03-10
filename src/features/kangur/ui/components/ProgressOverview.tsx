import LessonMasteryInsights from '@/features/kangur/ui/components/LessonMasteryInsights';
import {
  KangurDisplayEmoji,
  KangurGlassPanel,
  KangurMetricCard,
  KangurProgressBar,
  KangurStatusChip,
} from '@/features/kangur/ui/design/primitives';
import type { KangurAccent } from '@/features/kangur/ui/design/tokens';
import {
  getCurrentLevel,
  getNextLevel,
  getProgressBadges,
  getProgressAverageAccuracy,
  getProgressAverageXpPerSession,
  getProgressTopActivities,
} from '@/features/kangur/ui/services/progress';
import type { KangurProgressState } from '@/features/kangur/ui/types';

type ProgressOverviewProps = {
  progress: KangurProgressState;
};

type ProgressStat = {
  accent: KangurAccent;
  label: string;
  value: number | string;
};

export default function ProgressOverview({ progress }: ProgressOverviewProps): React.JSX.Element {
  const { totalXp, gamesPlayed, lessonsCompleted, operationsPlayed = [] } = progress;
  const currentLevel = getCurrentLevel(totalXp);
  const nextLevel = getNextLevel(totalXp);
  const xpIntoLevel = totalXp - currentLevel.minXp;
  const xpNeeded = nextLevel ? nextLevel.minXp - currentLevel.minXp : 1;
  const percent = nextLevel ? Math.min(100, Math.round((xpIntoLevel / xpNeeded) * 100)) : 100;
  const averageAccuracy = getProgressAverageAccuracy(progress);
  const averageXpPerSession = getProgressAverageXpPerSession(progress);
  const topActivities = getProgressTopActivities(progress);
  const badgeStatuses = getProgressBadges(progress);

  const stats: ProgressStat[] = [
    { accent: 'indigo', label: 'Laczne XP', value: totalXp },
    { accent: 'violet', label: 'XP / gre', value: averageXpPerSession },
    { accent: 'sky', label: 'Rozegrane gry', value: gamesPlayed },
    {
      accent: 'emerald',
      label: 'Ukonczone lekcje',
      value: lessonsCompleted,
    },
    { accent: 'amber', label: 'Srednia skutecznosc', value: `${averageAccuracy}%` },
    { accent: 'rose', label: 'Najlepsza seria', value: progress.bestWinStreak ?? 0 },
  ];

  return (
    <div className='flex flex-col gap-5'>
      <KangurGlassPanel
        className='flex flex-col gap-4 sm:flex-row sm:items-center'
        padding='lg'
        surface='mistStrong'
        variant='soft'
      >
        <KangurDisplayEmoji size='md'>🎖️</KangurDisplayEmoji>
        <div className='flex-1'>
          <div className='text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500'>
            Poziom i doswiadczenie
          </div>
          <p className={`mt-1 text-xl font-extrabold ${currentLevel.color}`}>{currentLevel.title}</p>
          <p className='mb-2 text-sm text-slate-500'>
            Poziom {currentLevel.level} · {totalXp} XP lacznie
          </p>
          <KangurProgressBar
            accent='indigo'
            animated
            data-testid='progress-overview-level-bar'
            size='md'
            value={percent}
          />
          <p className='mt-1 text-xs text-slate-500'>
            {nextLevel
              ? `Do poziomu ${nextLevel.level}: ${xpNeeded - xpIntoLevel} XP`
              : 'Osiagnieto maksymalny poziom!'}
          </p>
        </div>
      </KangurGlassPanel>

      <div className='grid grid-cols-2 sm:grid-cols-3 gap-3'>
        {stats.map((stat) => (
          <KangurMetricCard
            key={stat.label}
            accent={stat.accent}
            align='center'
            label={stat.label}
            value={stat.value}
          />
        ))}
      </div>

      <LessonMasteryInsights progress={progress} />

      {operationsPlayed.length > 0 && (
        <KangurGlassPanel padding='md' surface='solid' variant='subtle'>
          <p className='mb-3 text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500'>
            Cwiczone operacje
          </p>
          <div className='flex flex-wrap gap-2'>
            {operationsPlayed.map((operation) => (
              <KangurStatusChip
                accent='indigo'
                key={operation}
                className='capitalize'
                data-testid={`progress-overview-operation-${operation}`}
              >
                {operation}
              </KangurStatusChip>
            ))}
          </div>
        </KangurGlassPanel>
      )}

      {topActivities.length > 0 && (
        <KangurGlassPanel padding='md' surface='solid' variant='subtle'>
          <p className='mb-3 text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500'>
            Najczesciej cwiczone aktywnosci
          </p>
          <div className='flex flex-col gap-3'>
            {topActivities.map((activity) => (
              <div
                key={activity.key}
                className='flex items-center justify-between gap-3 rounded-3xl border border-slate-200/80 bg-white/80 px-4 py-3'
                data-testid={`progress-overview-activity-${activity.key}`}
              >
                <div className='min-w-0'>
                  <p className='truncate text-sm font-semibold text-slate-800'>{activity.label}</p>
                  <p className='text-xs text-slate-500'>
                    {activity.sessionsPlayed} sesji · {activity.averageXpPerSession} XP / gre ·
                    srednio {activity.averageAccuracy}% · najlepszy wynik{' '}
                    {activity.bestScorePercent}%
                  </p>
                </div>
                <KangurStatusChip accent='indigo'>{activity.totalXpEarned} XP</KangurStatusChip>
              </div>
            ))}
          </div>
        </KangurGlassPanel>
      )}

      <KangurGlassPanel padding='md' surface='solid' variant='subtle'>
        <p className='mb-3 text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500'>
          Odznaki
        </p>
        <div className='flex flex-wrap gap-2'>
          {badgeStatuses.map((badge) => {
            const unlocked = badge.isUnlocked;
            return (
              <KangurStatusChip
                accent={unlocked ? 'amber' : 'slate'}
                key={badge.id}
                className={unlocked ? 'gap-1.5' : 'gap-1.5 opacity-70'}
                title={`${badge.desc}${unlocked ? '' : ` (${badge.summary})`}`}
                data-testid={`progress-overview-badge-${badge.id}`}
              >
                <span className={unlocked ? '' : 'grayscale'}>{badge.emoji}</span>
                <span>{badge.name}</span>
                {!unlocked ? (
                  <span className='text-[11px] font-semibold text-slate-500'>{badge.summary}</span>
                ) : null}
              </KangurStatusChip>
            );
          })}
        </div>
      </KangurGlassPanel>
    </div>
  );
}

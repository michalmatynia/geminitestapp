import KangurBadgeTrackGrid from '@/features/kangur/ui/components/KangurBadgeTrackGrid';
import LessonMasteryInsights from '@/features/kangur/ui/components/LessonMasteryInsights';
import {
  KangurDisplayEmoji,
  KangurGlassPanel,
  KangurMetricCard,
  KangurProgressBar,
  KangurStatusChip,
} from '@/features/kangur/ui/design/primitives';
import type { KangurAccent } from '@/features/kangur/ui/design/tokens';
import type { KangurDailyQuestState } from '@/features/kangur/ui/services/daily-quests';
import {
  getCurrentLevel,
  getNextLevel,
  getProgressAverageAccuracy,
  getProgressAverageXpPerSession,
  getProgressTopActivities,
  getRecommendedSessionMomentum,
} from '@/features/kangur/ui/services/progress';
import type { KangurProgressState } from '@/features/kangur/ui/types';

type ProgressOverviewProps = {
  progress: KangurProgressState;
  dailyQuest?: KangurDailyQuestState | null;
};

type ProgressStat = {
  accent: KangurAccent;
  label: string;
  value: number | string;
};

export default function ProgressOverview({
  progress,
  dailyQuest = null,
}: ProgressOverviewProps): React.JSX.Element {
  const overviewProgress = progress;
  const { totalXp, gamesPlayed, lessonsCompleted, operationsPlayed = [] } = progress;
  const currentLevel = getCurrentLevel(totalXp);
  const nextLevel = getNextLevel(totalXp);
  const xpIntoLevel = totalXp - currentLevel.minXp;
  const xpNeeded = nextLevel ? nextLevel.minXp - currentLevel.minXp : 1;
  const percent = nextLevel ? Math.min(100, Math.round((xpIntoLevel / xpNeeded) * 100)) : 100;
  const averageAccuracy = getProgressAverageAccuracy(progress);
  const averageXpPerSession = getProgressAverageXpPerSession(progress);
  const topActivities = getProgressTopActivities(progress);
  const guidedMomentum = getRecommendedSessionMomentum(progress);
  const dailyQuestAccent =
    dailyQuest?.reward.status === 'claimed'
      ? 'emerald'
      : dailyQuest?.progress.status === 'completed'
        ? 'amber'
        : dailyQuest?.progress.status === 'in_progress'
          ? 'indigo'
          : 'slate';
  const dailyQuestProgressPercent = dailyQuest?.progress.percent ?? 0;
  const dailyQuestProgressAccent =
    dailyQuest?.reward.status === 'claimed' ? 'emerald' : dailyQuestAccent;

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
          <div className='text-[11px] font-bold uppercase tracking-[0.22em] [color:var(--kangur-page-muted-text)]'>
            Poziom i doswiadczenie
          </div>
          <p className={`mt-1 text-xl font-extrabold ${currentLevel.color}`}>{currentLevel.title}</p>
          <p className='mb-2 text-sm [color:var(--kangur-page-muted-text)]'>
            Poziom {currentLevel.level} · {totalXp} XP lacznie
          </p>
          <KangurProgressBar
            accent='indigo'
            animated
            data-testid='progress-overview-level-bar'
            size='md'
            value={percent}
          />
          <p className='mt-1 text-xs [color:var(--kangur-page-muted-text)]'>
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

      {dailyQuest ? (
        <KangurGlassPanel
          data-testid='progress-overview-daily-quest'
          padding='md'
          surface='solid'
          variant='subtle'
        >
          <div className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
            <div className='min-w-0'>
              <p className='text-[11px] font-bold uppercase tracking-[0.22em] [color:var(--kangur-page-muted-text)]'>
                Misja dnia
              </p>
              <p className='mt-1 text-sm font-semibold [color:var(--kangur-page-text)]'>
                {dailyQuest.assignment.title}
              </p>
              <p className='mt-1 text-xs leading-5 [color:var(--kangur-page-muted-text)]'>
                {dailyQuest.progress.summary} · {dailyQuest.reward.label}
              </p>
            </div>
            <KangurStatusChip accent={dailyQuestAccent} className='shrink-0'>
              {dailyQuest.progress.percent}%
            </KangurStatusChip>
          </div>
          <KangurProgressBar
            accent={dailyQuestProgressAccent}
            className='mt-3'
            data-testid='progress-overview-daily-quest-bar'
            size='sm'
            value={dailyQuestProgressPercent}
          />
        </KangurGlassPanel>
      ) : null}

      {guidedMomentum.completedSessions > 0 ? (
        <KangurGlassPanel
          data-testid='progress-overview-guided-momentum'
          padding='md'
          surface='solid'
          variant='subtle'
        >
          <div className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
            <div className='min-w-0'>
              <p className='text-[11px] font-bold uppercase tracking-[0.22em] [color:var(--kangur-page-muted-text)]'>
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
            data-testid='progress-overview-guided-momentum-bar'
            size='sm'
            value={guidedMomentum.progressPercent}
          />
        </KangurGlassPanel>
      ) : null}

      <LessonMasteryInsights progress={overviewProgress} />

      {operationsPlayed.length > 0 && (
        <KangurGlassPanel padding='md' surface='solid' variant='subtle'>
          <p className='mb-3 text-[11px] font-bold uppercase tracking-[0.22em] [color:var(--kangur-page-muted-text)]'>
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
          <p className='mb-3 text-[11px] font-bold uppercase tracking-[0.22em] [color:var(--kangur-page-muted-text)]'>
            Najczesciej cwiczone aktywnosci
          </p>
          <div className='flex flex-col gap-3'>
            {topActivities.map((activity) => (
              <div
                key={activity.key}
                className='soft-card flex items-center justify-between gap-3 rounded-3xl border border-slate-200/80 px-4 py-3'
                data-testid={`progress-overview-activity-${activity.key}`}
              >
                <div className='min-w-0'>
                  <p className='truncate text-sm font-semibold [color:var(--kangur-page-text)]'>
                    {activity.label}
                  </p>
                  <p className='text-xs [color:var(--kangur-page-muted-text)]'>
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
        <p className='mb-3 text-[11px] font-bold uppercase tracking-[0.22em] [color:var(--kangur-page-muted-text)]'>
          Sciezki odznak
        </p>
        <KangurBadgeTrackGrid
          dataTestIdPrefix='progress-overview-badge-track'
          emptyTestId='progress-overview-badges-empty'
          progress={overviewProgress}
        />
      </KangurGlassPanel>
    </div>
  );
}

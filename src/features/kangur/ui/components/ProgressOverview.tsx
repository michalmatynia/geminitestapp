import KangurBadgeTrackGrid from '@/features/kangur/ui/components/KangurBadgeTrackGrid';
import LessonMasteryInsights from '@/features/kangur/ui/components/LessonMasteryInsights';
import {
  KangurDisplayEmoji,
  KangurGlassPanel,
  KangurMetricCard,
  KangurPanelIntro,
  KangurProgressBar,
  KangurSectionEyebrow,
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
          <KangurPanelIntro
            eyebrow='Poziom i doswiadczenie'
            title={currentLevel.title}
            titleAs='p'
            titleClassName={`mt-1 text-lg font-extrabold sm:text-xl ${currentLevel.color}`}
            description={`Poziom ${currentLevel.level} · ${totalXp} XP lacznie`}
            descriptionClassName='mb-2'
          />
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

      <div className='grid grid-cols-1 gap-3 min-[360px]:grid-cols-2 sm:grid-cols-3'>
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
            <KangurPanelIntro
              className='min-w-0'
              eyebrow='Misja dnia'
              title={dailyQuest.assignment.title}
              titleAs='p'
              description={`${dailyQuest.progress.summary} · ${dailyQuest.reward.label}`}
              descriptionClassName='mt-1 text-xs leading-5'
            />
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
            <KangurPanelIntro
              className='min-w-0'
              eyebrow='Polecony kierunek'
              title={`${guidedMomentum.completedSessions} polecone rundy`}
              titleAs='p'
              description={
                guidedMomentum.nextBadgeName
                  ? `Do odznaki ${guidedMomentum.nextBadgeName}: ${guidedMomentum.summary}`
                  : 'Wszystkie odznaki polecanego kierunku odblokowane.'
              }
              descriptionClassName='mt-1 text-xs leading-5'
            />
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
          <KangurSectionEyebrow as='p' className='mb-3'>
            Cwiczone operacje
          </KangurSectionEyebrow>
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
          <KangurSectionEyebrow as='p' className='mb-3'>
            Najczesciej cwiczone aktywnosci
          </KangurSectionEyebrow>
          <div className='flex flex-col gap-3'>
            {topActivities.map((activity) => (
              <div
                key={activity.key}
                className='soft-card flex flex-col items-start gap-3 rounded-3xl border [border-color:var(--kangur-soft-card-border)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between'
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
                <KangurStatusChip accent='indigo' className='self-start sm:self-auto'>
                  {activity.totalXpEarned} XP
                </KangurStatusChip>
              </div>
            ))}
          </div>
        </KangurGlassPanel>
      )}

      <KangurGlassPanel padding='md' surface='solid' variant='subtle'>
        <KangurSectionEyebrow as='p' className='mb-3'>
          Sciezki odznak
        </KangurSectionEyebrow>
        <KangurBadgeTrackGrid
          dataTestIdPrefix='progress-overview-badge-track'
          emptyTestId='progress-overview-badges-empty'
          progress={overviewProgress}
        />
      </KangurGlassPanel>
    </div>
  );
}

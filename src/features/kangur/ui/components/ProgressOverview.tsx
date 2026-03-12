import { KangurActivitySummaryCard } from '@/features/kangur/ui/components/KangurActivitySummaryCard';
import { KangurBadgeTrackSection } from '@/features/kangur/ui/components/KangurBadgeTrackSection';
import { KangurPanelSectionHeading } from '@/features/kangur/ui/components/KangurPanelSectionHeading';
import { KangurProgressHighlightCardContent } from '@/features/kangur/ui/components/KangurProgressHighlightCardContent';
import LessonMasteryInsights from '@/features/kangur/ui/components/LessonMasteryInsights';
import {
  KangurDisplayEmoji,
  KangurGlassPanel,
  KangurMetricCard,
  KangurPanelIntro,
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
    { accent: 'indigo', label: 'Łączne XP', value: totalXp },
    { accent: 'violet', label: 'XP / grę', value: averageXpPerSession },
    { accent: 'sky', label: 'Rozegrane gry', value: gamesPlayed },
    {
      accent: 'emerald',
      label: 'Ukończone lekcje',
      value: lessonsCompleted,
    },
    { accent: 'amber', label: 'Średnia skuteczność', value: `${averageAccuracy}%` },
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
            eyebrow='Poziom i doświadczenie'
            title={currentLevel.title}
            titleAs='p'
            titleClassName={`mt-1 text-lg font-extrabold sm:text-xl ${currentLevel.color}`}
            description={`Poziom ${currentLevel.level} · ${totalXp} XP łącznie`}
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
              : 'Osiągnięto maksymalny poziom!'}
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
          <KangurProgressHighlightCardContent
            chipAccent={dailyQuestAccent}
            chipClassName='shrink-0'
            chipLabel={`${dailyQuest.progress.percent}%`}
            description={`${dailyQuest.progress.summary} · ${dailyQuest.reward.label}`}
            descriptionClassName='text-xs leading-5'
            eyebrow='Misja dnia'
            headerClassName='sm:items-start'
            progressAccent={dailyQuestProgressAccent}
            progressBarTestId='progress-overview-daily-quest-bar'
            progressValue={dailyQuestProgressPercent}
            title={dailyQuest.assignment.title}
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
          <KangurProgressHighlightCardContent
            chipAccent='sky'
            chipClassName='shrink-0'
            chipLabel={guidedMomentum.summary}
            description={
              guidedMomentum.nextBadgeName
                ? `Do odznaki ${guidedMomentum.nextBadgeName}: ${guidedMomentum.summary}`
                : 'Wszystkie odznaki polecanego kierunku odblokowane.'
            }
            descriptionClassName='text-xs leading-5'
            eyebrow='Polecony kierunek'
            headerClassName='sm:items-start'
            progressAccent='sky'
            progressBarTestId='progress-overview-guided-momentum-bar'
            progressValue={guidedMomentum.progressPercent}
            title={`${guidedMomentum.completedSessions} polecone rundy`}
          />
        </KangurGlassPanel>
      ) : null}

      <LessonMasteryInsights progress={overviewProgress} />

      {operationsPlayed.length > 0 && (
        <KangurGlassPanel padding='md' surface='solid' variant='subtle'>
          <KangurPanelSectionHeading>Ćwiczone operacje</KangurPanelSectionHeading>
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
          <KangurPanelSectionHeading>Najczęściej ćwiczone aktywności</KangurPanelSectionHeading>
          <div className='flex flex-col gap-3'>
            {topActivities.map((activity) => (
              <KangurActivitySummaryCard
                activity={activity}
                dataTestId={`progress-overview-activity-${activity.key}`}
                description={`${
                  activity.sessionsPlayed
                } sesji · ${activity.averageXpPerSession} XP / grę · średnio ${
                  activity.averageAccuracy
                }% · najlepszy wynik ${activity.bestScorePercent}%`}
                descriptionClassName='text-xs [color:var(--kangur-page-muted-text)]'
                key={activity.key}
              />
            ))}
          </div>
        </KangurGlassPanel>
      )}

      <KangurGlassPanel padding='md' surface='solid' variant='subtle'>
        <KangurBadgeTrackSection
          dataTestIdPrefix='progress-overview-badge-track'
          emptyTestId='progress-overview-badges-empty'
          progress={overviewProgress}
        />
      </KangurGlassPanel>
    </div>
  );
}

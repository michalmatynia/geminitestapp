import { KangurActivitySummaryCard } from '@/features/kangur/ui/components/KangurActivitySummaryCard';
import { KangurBadgeTrackSection } from '@/features/kangur/ui/components/KangurBadgeTrackSection';
import { KangurPanelSectionHeading } from '@/features/kangur/ui/components/KangurPanelSectionHeading';
import {
  KangurProgressHighlightCardContent,
  KangurProgressHighlightHeader,
  KangurProgressHighlightChip,
  KangurProgressHighlightBar,
} from '@/features/kangur/ui/components/KangurProgressHighlightCardContent';
import LessonMasteryInsights from '@/features/kangur/ui/components/LessonMasteryInsights';
import {
  KangurDisplayEmoji,
  KangurGlassPanel,
  KangurMetricCard,
  KangurPanelIntro,
  KangurPanelRow,
  KangurProgressBar,
  KangurStatusChip,
} from '@/features/kangur/ui/design/primitives';
import { KANGUR_PANEL_GAP_CLASSNAME, type KangurAccent } from '@/features/kangur/ui/design/tokens';
import type { KangurDailyQuestState } from '@/features/kangur/shared/contracts/kangur-quests';
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
  const dailyQuestHeaderDescription = dailyQuest
    ? `${dailyQuest.progress.summary} · ${dailyQuest.reward.label}`
    : '';
  const dailyQuestHeaderTitle = dailyQuest?.assignment.title ?? '';
  const dailyQuestProgressLabel = dailyQuest ? `${dailyQuest.progress.percent}%` : '';

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
    <div className={`flex flex-col ${KANGUR_PANEL_GAP_CLASSNAME}`}>
      <KangurGlassPanel padding='lg' surface='mistStrong' variant='soft'>
        <KangurPanelRow className='sm:items-center'>
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
        </KangurPanelRow>
      </KangurGlassPanel>

      <div className='grid grid-cols-1 kangur-panel-gap min-[360px]:grid-cols-2 sm:grid-cols-3'>
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
          <KangurProgressHighlightCardContent>
            <div className='flex flex-col items-start kangur-panel-gap sm:flex-row sm:justify-between'>
              <KangurProgressHighlightHeader
                description={dailyQuestHeaderDescription}
                descriptionClassName='text-xs leading-5'
                eyebrow='Misja dnia'
                title={dailyQuestHeaderTitle}
              />
              <KangurProgressHighlightChip
                accent={dailyQuestAccent}
                className='shrink-0'
                label={dailyQuestProgressLabel}
              />
            </div>
            <KangurProgressHighlightBar
              accent={dailyQuestProgressAccent}
              testId='progress-overview-daily-quest-bar'
              value={dailyQuestProgressPercent}
            />
          </KangurProgressHighlightCardContent>
        </KangurGlassPanel>
      ) : null}

      {guidedMomentum.completedSessions > 0 ? (
        <KangurGlassPanel
          data-testid='progress-overview-guided-momentum'
          padding='md'
          surface='solid'
          variant='subtle'
        >
          <KangurProgressHighlightCardContent>
            <div className='flex flex-col items-start kangur-panel-gap sm:flex-row sm:justify-between'>
              <KangurProgressHighlightHeader
                description={
                  guidedMomentum.nextBadgeName
                    ? `Do odznaki ${guidedMomentum.nextBadgeName}: ${guidedMomentum.summary}`
                    : 'Wszystkie odznaki polecanego kierunku odblokowane.'
                }
                descriptionClassName='text-xs leading-5'
                eyebrow='Polecony kierunek'
                title={`${guidedMomentum.completedSessions} polecone rundy`}
              />
              <KangurProgressHighlightChip
                accent='sky'
                className='shrink-0'
                label={guidedMomentum.summary}
              />
            </div>
            <KangurProgressHighlightBar
              accent='sky'
              testId='progress-overview-guided-momentum-bar'
              value={guidedMomentum.progressPercent}
            />
          </KangurProgressHighlightCardContent>
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
          <div className='flex flex-col kangur-panel-gap'>
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

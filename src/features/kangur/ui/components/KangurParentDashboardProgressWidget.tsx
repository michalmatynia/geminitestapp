import {
  appendKangurUrlParams,
  getKangurPageHref as createPageUrl,
} from '@/features/kangur/config/routing';
import KangurDailyQuestHighlightCardContent from '@/features/kangur/ui/components/KangurDailyQuestHighlightCardContent';
import ProgressOverview from '@/features/kangur/ui/components/ProgressOverview';
import KangurBadgeTrackHighlights from '@/features/kangur/ui/components/KangurBadgeTrackHighlights';
import { KangurTransitionLink as Link } from '@/features/kangur/ui/components/KangurTransitionLink';
import {
  type KangurParentDashboardPanelDisplayMode,
  shouldRenderKangurParentDashboardPanel,
  useKangurParentDashboardRuntime,
} from '@/features/kangur/ui/context/KangurParentDashboardRuntimeContext';
import {
  KangurButton,
  KangurMetaText,
  KangurPanelIntro,
  KangurSummaryPanel,
} from '@/features/kangur/ui/design/primitives';
import { useKangurPageContentEntry } from '@/features/kangur/ui/hooks/useKangurPageContent';
import { getCurrentKangurDailyQuest } from '@/features/kangur/ui/services/daily-quests';

const buildAssignmentHref = (
  basePath: string,
  action: {
    page: 'Game' | 'Lessons' | 'ParentDashboard' | 'LearnerProfile';
    query?: Record<string, string>;
  }
): string => {
  const href = createPageUrl(action.page, basePath);
  return action.query ? appendKangurUrlParams(href, action.query, basePath) : href;
};

export function KangurParentDashboardProgressWidget({
  displayMode = 'always',
}: {
  displayMode?: KangurParentDashboardPanelDisplayMode;
}): React.JSX.Element | null {
  const { activeLearner, activeTab, basePath, canAccessDashboard, progress } =
    useKangurParentDashboardRuntime();
  const { entry: progressContent } = useKangurPageContentEntry('parent-dashboard-progress');
  const activeLearnerId = activeLearner?.id ?? null;

  if (!canAccessDashboard) {
    return null;
  }

  if (!shouldRenderKangurParentDashboardPanel(displayMode, activeTab, 'progress')) {
    return null;
  }

  if (!activeLearnerId) {
    return null;
  }

  const dailyQuest = getCurrentKangurDailyQuest(progress);
  const dailyQuestAction = dailyQuest?.assignment.action ?? null;
  const dailyQuestHref = dailyQuestAction ? buildAssignmentHref(basePath, dailyQuestAction) : null;
  const dailyQuestTargetPage = dailyQuestAction?.page ?? null;
  const dailyQuestAccent =
    dailyQuest?.reward.status === 'claimed'
      ? 'emerald'
      : dailyQuest?.progress.status === 'completed'
        ? 'amber'
        : dailyQuest?.progress.status === 'in_progress'
          ? 'indigo'
          : 'slate';
  const dailyQuestRewardAccent =
    dailyQuest?.reward.status === 'claimed' ? 'emerald' : dailyQuestAccent;
  const dailyQuestActionLabel = dailyQuestAction?.label ?? '';
  const dailyQuestDescription = dailyQuest?.assignment.description ?? '';
  const dailyQuestProgressSummary = dailyQuest?.progress.summary ?? '';
  const dailyQuestProgressLabel = dailyQuest ? `${dailyQuest.progress.percent}%` : '';
  const dailyQuestLabel = dailyQuest?.assignment.questLabel ?? 'Misja dnia';
  const dailyQuestRewardLabel = dailyQuest?.reward.label ?? '';
  const dailyQuestTitle = dailyQuest?.assignment.title ?? '';

  return (
    <div className='flex flex-col gap-5'>
      <KangurPanelIntro
        description={
          progressContent?.summary ??
          'Sprawdź rytm nauki, poziom, misje dnia i główny kierunek dalszej pracy.'
        }
        title={progressContent?.title ?? 'Postęp ucznia'}
        titleAs='h2'
        titleClassName='text-lg font-bold tracking-[-0.02em]'
      />
      {dailyQuest ? (
        <KangurSummaryPanel
          accent='violet'
          className='mt-1'
          data-testid='parent-dashboard-daily-quest'
          description='To aktualna misja dnia ucznia, zsynchronizowana z widokiem gry i profilu.'
          label='Misja dnia ucznia'
        >
          <div className='mt-3 flex flex-col gap-3 rounded-[28px] border border-violet-200/80 bg-white/82 px-4 py-4'>
            <KangurDailyQuestHighlightCardContent
              action={
                dailyQuestHref ? (
                  <KangurButton asChild className='shrink-0' size='sm' variant='surface'>
                    <Link
                      href={dailyQuestHref}
                      targetPageKey={dailyQuestTargetPage ?? undefined}
                      transitionAcknowledgeMs={110}
                      transitionSourceId='parent-dashboard:daily-quest'
                    >
                      {dailyQuestActionLabel}
                    </Link>
                  </KangurButton>
                ) : null
              }
              chipLabelStyle='compact'
              description={dailyQuestDescription}
              descriptionClassName='mt-1 text-slate-600'
              descriptionRelaxed
              descriptionSize='sm'
              footer={
                <KangurMetaText caps className='mt-2' tone='slate'>
                  {dailyQuestProgressSummary}
                </KangurMetaText>
              }
              progressAccent={dailyQuestAccent}
              progressLabel={dailyQuestProgressLabel}
              questLabel={dailyQuestLabel}
              rewardAccent={dailyQuestRewardAccent}
              rewardLabel={dailyQuestRewardLabel}
              title={dailyQuestTitle}
              titleClassName='text-slate-900'
            />
          </div>
        </KangurSummaryPanel>
      ) : null}
      <KangurSummaryPanel
        accent='indigo'
        data-testid='parent-dashboard-track-summary'
        description='Najważniejsze ścieżki odznak, które aktualnie buduje uczeń.'
        label='Ścieżki postępu ucznia'
      >
        <div className='mt-3'>
          <KangurBadgeTrackHighlights
            dataTestIdPrefix='parent-dashboard-track'
            limit={3}
            progress={progress}
          />
        </div>
      </KangurSummaryPanel>
      <ProgressOverview progress={progress} dailyQuest={dailyQuest} />
    </div>
  );
}

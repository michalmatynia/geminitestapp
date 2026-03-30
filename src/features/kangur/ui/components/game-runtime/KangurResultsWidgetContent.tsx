import { useTranslations } from 'next-intl';

import ScoreHistory from '@/features/kangur/ui/components/ScoreHistory';
import KangurBadgeTrackHighlights from '@/features/kangur/ui/components/badge-track/KangurBadgeTrackHighlights';
import ProgressOverview from '@/features/kangur/ui/components/ProgressOverview';
import { useKangurSubjectFocus } from '@/features/kangur/ui/context/KangurSubjectFocusContext';
import {
  KangurPanelStack,
  KangurSummaryPanel,
} from '@/features/kangur/ui/design/primitives';
import { getCurrentKangurDailyQuest } from '@/features/kangur/ui/services/daily-quests';
import type { KangurScoreRecord } from '@kangur/platform';
import type { KangurProgressState } from '@/features/kangur/ui/types';

type KangurResultsWidgetContentProps = {
  basePath: string;
  progress: KangurProgressState;
  learnerId: string;
  playerName?: string | null;
  createdBy?: string | null;
  prefetchedScores?: KangurScoreRecord[] | null;
  prefetchedScoresLoading?: boolean;
  badgeTrackDataTestPrefix: string;
  summaryTestId: string;
  summaryDescription: string;
  summaryLabel: string;
  showProgressOverview?: boolean;
};

const renderKangurResultsWidgetContent = ({
  badgeTrackDataTestPrefix,
  basePath,
  createdBy,
  dailyQuest,
  learnerId,
  playerName,
  prefetchedScores,
  prefetchedScoresLoading,
  progress,
  showProgressOverview,
  summaryDescription,
  summaryLabel,
  summaryTestId,
}: KangurResultsWidgetContentProps & {
  dailyQuest: ReturnType<typeof getCurrentKangurDailyQuest> | null;
}): React.JSX.Element => (
  <KangurPanelStack>
    <KangurSummaryPanel
      accent='indigo'
      data-testid={summaryTestId}
      description={summaryDescription}
      label={summaryLabel}
    >
      <div className='mt-3'>
        <KangurBadgeTrackHighlights
          dataTestIdPrefix={badgeTrackDataTestPrefix}
          limit={3}
          progress={progress}
        />
      </div>
    </KangurSummaryPanel>
    {showProgressOverview ? (
      <ProgressOverview dailyQuest={dailyQuest} progress={progress} />
    ) : null}
    <ScoreHistory
      basePath={basePath}
      createdBy={createdBy}
      learnerId={learnerId}
      playerName={playerName}
      prefetchedScores={prefetchedScores}
      prefetchedLoading={prefetchedScoresLoading}
    />
  </KangurPanelStack>
);

export function KangurResultsWidgetContent({
  basePath,
  progress,
  learnerId,
  playerName = null,
  createdBy = null,
  prefetchedScores = null,
  prefetchedScoresLoading = false,
  badgeTrackDataTestPrefix,
  summaryTestId,
  summaryDescription,
  summaryLabel,
  showProgressOverview = true,
}: KangurResultsWidgetContentProps): React.JSX.Element {
  const runtimeTranslations = useTranslations('KangurProgressRuntime');
  const { subject, subjectKey } = useKangurSubjectFocus();
  const dailyQuest = showProgressOverview
    ? getCurrentKangurDailyQuest(progress, {
        ownerKey: subjectKey,
        subject,
        translate: runtimeTranslations,
      })
    : null;

  return renderKangurResultsWidgetContent({
    badgeTrackDataTestPrefix,
    basePath,
    createdBy,
    dailyQuest,
    learnerId,
    playerName,
    prefetchedScores,
    prefetchedScoresLoading,
    progress,
    showProgressOverview,
    summaryDescription,
    summaryLabel,
    summaryTestId,
  });
}

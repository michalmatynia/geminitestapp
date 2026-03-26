'use client';

import { useTranslations } from 'next-intl';

import { useKangurLearnerProfileRuntime } from '@/features/kangur/ui/context/KangurLearnerProfileRuntimeContext';
import {
  KangurPanelIntro,
} from '@/features/kangur/ui/design/primitives';
import { KANGUR_PANEL_GAP_CLASSNAME } from '@/features/kangur/ui/design/tokens';
import { useKangurPageContentEntry } from '@/features/kangur/ui/hooks/useKangurPageContent';

import { KangurResultsWidgetContent } from './KangurResultsWidgetContent';

export function KangurLearnerProfileResultsWidget(): React.JSX.Element | null {
  const translations = useTranslations('KangurParentDashboard');
  const { basePath, progress, scores, isLoadingScores, user } = useKangurLearnerProfileRuntime();
  const { entry: resultsContent } = useKangurPageContentEntry('learner-profile-results');
  const activeLearnerId = user?.activeLearner?.id?.trim() ?? '';

  if (!activeLearnerId) {
    return null;
  }

  const playerName =
    user?.activeLearner?.displayName?.trim() || user?.full_name?.trim() || null;
  const createdBy = user?.email?.trim() || null;

  return (
    <section className={`flex flex-col ${KANGUR_PANEL_GAP_CLASSNAME}`}>
      <KangurPanelIntro
        data-testid='learner-profile-results-intro'
        description={
          resultsContent?.summary ??
          translations('widgets.scores.description')
        }
        eyebrow={resultsContent?.title ?? translations('widgets.scores.title')}
      />
      <KangurResultsWidgetContent
        badgeTrackDataTestPrefix='learner-profile-results-track'
        basePath={basePath}
        createdBy={createdBy}
        learnerId={activeLearnerId}
        playerName={playerName}
        prefetchedScores={scores}
        prefetchedScoresLoading={isLoadingScores}
        progress={progress}
        showProgressOverview={false}
        summaryDescription={translations('widgets.scores.trackSummary.description')}
        summaryLabel={translations('widgets.scores.trackSummary.label')}
        summaryTestId='learner-profile-results-track-summary'
      />
    </section>
  );
}

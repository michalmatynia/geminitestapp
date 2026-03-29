'use client';

import { useTranslations } from 'next-intl';

import { useKangurLearnerProfileRuntime } from '@/features/kangur/ui/context/KangurLearnerProfileRuntimeContext';
import {
  KangurPanelIntro,
} from '@/features/kangur/ui/design/primitives';
import { KANGUR_PANEL_GAP_CLASSNAME } from '@/features/kangur/ui/design/tokens';
import { useKangurPageContentEntry } from '@/features/kangur/ui/hooks/useKangurPageContent';

import { KangurResultsWidgetContent } from './KangurResultsWidgetContent';

const resolveKangurLearnerProfileResultsLearnerId = (
  user: ReturnType<typeof useKangurLearnerProfileRuntime>['user']
): string => user?.activeLearner?.id?.trim() ?? '';

const resolveKangurLearnerProfileResultsPlayerName = (
  user: ReturnType<typeof useKangurLearnerProfileRuntime>['user']
): string | null => user?.activeLearner?.displayName?.trim() || user?.full_name?.trim() || null;

const resolveKangurLearnerProfileResultsCreatedBy = (
  user: ReturnType<typeof useKangurLearnerProfileRuntime>['user']
): string | null => user?.email?.trim() || null;

const resolveKangurLearnerProfileResultsIntro = ({
  resultsContent,
  translations,
}: {
  resultsContent: ReturnType<typeof useKangurPageContentEntry>['entry'];
  translations: ReturnType<typeof useTranslations<'KangurParentDashboard'>>;
}): { description: string; title: string } => ({
  description: resultsContent?.summary ?? translations('widgets.scores.description'),
  title: resultsContent?.title ?? translations('widgets.scores.title'),
});

export function KangurLearnerProfileResultsWidget(): React.JSX.Element | null {
  const translations = useTranslations('KangurParentDashboard');
  const { basePath, progress, scores, isLoadingScores, user } = useKangurLearnerProfileRuntime();
  const { entry: resultsContent } = useKangurPageContentEntry('learner-profile-results');
  const activeLearnerId = resolveKangurLearnerProfileResultsLearnerId(user);
  const createdBy = resolveKangurLearnerProfileResultsCreatedBy(user);
  const playerName = resolveKangurLearnerProfileResultsPlayerName(user);
  const { description, title } = resolveKangurLearnerProfileResultsIntro({
    resultsContent,
    translations,
  });

  if (!activeLearnerId) {
    return null;
  }

  return (
    <section className={`flex flex-col ${KANGUR_PANEL_GAP_CLASSNAME}`}>
      <KangurPanelIntro
        data-testid='learner-profile-results-intro'
        description={description}
        eyebrow={title}
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

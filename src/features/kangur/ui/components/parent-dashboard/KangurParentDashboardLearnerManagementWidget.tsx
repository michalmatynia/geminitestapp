import type React from 'react';

import { KangurPanelIntro, KangurPanelStack } from '@/features/kangur/ui/design/primitives';
import { useKangurPageContentEntry } from '@/features/kangur/ui/hooks/useKangurPageContent';

import {
  LearnerManagementProvider,
  useLearnerManagementContext,
} from './KangurParentDashboardLearnerManagement.context';
import {
  LearnerManagementCardsGrid,
  LearnerManagementModal,
  LearnerManagementSettingsShortcut,
} from './KangurParentDashboardLearnerManagementWidget.sections';

function LearnerManagementWidgetContent(): React.JSX.Element | null {
  const { state, runtime } = useLearnerManagementContext();
  const { copy, isCoarsePointer, overview } = state;
  const {
    selectedLearnerId,
    handleOpenActiveLearnerSettings,
    handleOpenLearner,
    handleCreateNew,
  } = runtime;
  const { entry: learnerManagementContent } = useKangurPageContentEntry(
    'parent-dashboard-learner-management'
  );

  if (!overview.canAccessDashboard) {
    return null;
  }

  return (
    <KangurPanelStack className='w-full'>
      <KangurPanelIntro
        eyebrow={copy.learnerManagementEyebrow}
        title={learnerManagementContent?.title ?? copy.learnerManagementTitle}
        description={learnerManagementContent?.summary ?? copy.learnerManagementDescription}
      />

      <LearnerManagementSettingsShortcut
        copy={copy}
        isCoarsePointer={isCoarsePointer}
        activeLearner={overview.activeLearner}
        onOpenActiveLearnerSettings={handleOpenActiveLearnerSettings}
      />

      <LearnerManagementCardsGrid
        learners={overview.learners}
        selectedLearnerId={selectedLearnerId}
        copy={copy}
        isCoarsePointer={isCoarsePointer}
        onOpenLearner={handleOpenLearner}
        onCreateNew={handleCreateNew}
      />

      <LearnerManagementModal />
    </KangurPanelStack>
  );
}

export function KangurParentDashboardLearnerManagementWidget(): React.JSX.Element | null {
  return (
    <LearnerManagementProvider>
      <LearnerManagementWidgetContent />
    </LearnerManagementProvider>
  );
}

export default KangurParentDashboardLearnerManagementWidget;

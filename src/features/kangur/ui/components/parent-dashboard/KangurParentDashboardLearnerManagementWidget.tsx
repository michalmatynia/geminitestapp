import type React from 'react';

import { KangurPanelIntro, KangurPanelStack } from '@/features/kangur/ui/design/primitives';
import { useKangurPageContentEntry } from '@/features/kangur/ui/hooks/useKangurPageContent';

import { useLearnerManagementState } from './KangurParentDashboardLearnerManagementWidget.hooks';
import { useLearnerManagementWidgetRuntime } from './KangurParentDashboardLearnerManagementWidget.runtime';
import {
  LearnerManagementCardsGrid,
  LearnerManagementModal,
  LearnerManagementSettingsShortcut,
} from './KangurParentDashboardLearnerManagementWidget.sections';

export function KangurParentDashboardLearnerManagementWidget(): React.JSX.Element | null {
  const state = useLearnerManagementState();
  const {
    copy,
    isCoarsePointer,
    overview,
    activeTab,
    isLoadingSessions,
    isLoadingMoreSessions,
    sessionsError,
    sessionsLoadMoreError,
  } = state;
  const { entry: learnerManagementContent } = useKangurPageContentEntry(
    'parent-dashboard-learner-management'
  );
  const runtime = useLearnerManagementWidgetRuntime(state);

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
        onOpenActiveLearnerSettings={runtime.handleOpenActiveLearnerSettings}
      />

      <LearnerManagementCardsGrid
        learners={overview.learners}
        selectedLearnerId={runtime.selectedLearnerId}
        copy={copy}
        isCoarsePointer={isCoarsePointer}
        onOpenLearner={runtime.handleOpenLearner}
        onCreateNew={runtime.handleCreateNew}
      />

      <LearnerManagementModal
        copy={copy}
        open={runtime.modalOpen}
        isCreateModalVisible={runtime.isCreateModalVisible}
        activeTab={activeTab}
        isCoarsePointer={isCoarsePointer}
        showPassword={runtime.showPassword}
        isConfirmingRemove={runtime.isConfirmingRemove}
        createForm={overview.createForm}
        editForm={overview.editForm}
        feedback={overview.feedback}
        isSubmitting={overview.isSubmitting}
        activeProfileId={runtime.activeProfileId}
        activeProfile={runtime.activeProfile}
        sessions={runtime.sessions}
        sessionsError={sessionsError}
        sessionsLoadMoreError={sessionsLoadMoreError}
        isLoadingSessions={isLoadingSessions}
        isLoadingMoreSessions={isLoadingMoreSessions}
        hasMoreSessions={runtime.hasMoreSessions}
        onClose={runtime.handleCloseWidgetModal}
        onSelectTab={runtime.setActiveTab}
        onDisplayNameChange={runtime.handleDisplayNameChange}
        onLoginNameChange={runtime.handleLoginNameChange}
        onAgeChange={runtime.handleAgeChange}
        onPasswordChange={runtime.handlePasswordChange}
        onStatusChange={runtime.handleStatusChange}
        onTogglePassword={runtime.handleTogglePassword}
        onCancelRemove={runtime.handleCancelRemove}
        onConfirmRemove={runtime.handleConfirmRemove}
        onSave={runtime.handleSaveAction}
        onStartRemove={runtime.handleStartRemove}
        onLoadMoreSessions={runtime.handleLoadMoreSessions}
      />
    </KangurPanelStack>
  );
}

export default KangurParentDashboardLearnerManagementWidget;

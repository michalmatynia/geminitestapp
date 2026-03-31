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
  const {
    copy,
    isCoarsePointer,
    overview,
    isLoadingSessions,
    isLoadingMoreSessions,
    sessionsError,
    sessionsLoadMoreError,
  } = state;
  const {
    selectedLearnerId,
    isCreateModalVisible,
    hasMoreSessions,
    modalOpen,
    showPassword,
    isConfirmingRemove,
    activeTab,
    activeProfile,
    sessions,
    handleOpenActiveLearnerSettings,
    handleOpenLearner,
    handleCreateNew,
    handleCloseWidgetModal,
    setActiveTab,
    handleDisplayNameChange,
    handleLoginNameChange,
    handleAgeChange,
    handlePasswordChange,
    handleStatusChange,
    handleTogglePassword,
    handleCancelRemove,
    handleConfirmRemove,
    handleSaveAction,
    handleStartRemove,
    handleLoadMoreSessions,
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

      <LearnerManagementModal
        copy={copy}
        open={modalOpen}
        isCreateModalVisible={isCreateModalVisible}
        activeTab={activeTab}
        isCoarsePointer={isCoarsePointer}
        showPassword={showPassword}
        isConfirmingRemove={isConfirmingRemove}
        createForm={overview.createForm}
        editForm={overview.editForm}
        feedback={overview.feedback}
        isSubmitting={overview.isSubmitting}
        activeProfileId={selectedLearnerId}
        activeProfile={activeProfile}
        sessions={sessions}
        sessionsError={sessionsError}
        sessionsLoadMoreError={sessionsLoadMoreError}
        isLoadingSessions={isLoadingSessions}
        isLoadingMoreSessions={isLoadingMoreSessions}
        hasMoreSessions={hasMoreSessions}
        onClose={handleCloseWidgetModal}
        onSelectTab={setActiveTab}
        onDisplayNameChange={handleDisplayNameChange}
        onLoginNameChange={handleLoginNameChange}
        onAgeChange={handleAgeChange}
        onPasswordChange={handlePasswordChange}
        onStatusChange={handleStatusChange}
        onTogglePassword={handleTogglePassword}
        onCancelRemove={handleCancelRemove}
        onConfirmRemove={handleConfirmRemove}
        onSave={handleSaveAction}
        onStartRemove={handleStartRemove}
        onLoadMoreSessions={handleLoadMoreSessions}
      />
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

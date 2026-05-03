'use client';

import { useState } from 'react';
import type React from 'react';

import { withKangurClientError } from '@/features/kangur/observability/client';

import { type useLearnerManagementState } from './KangurParentDashboardLearnerManagementWidget.hooks';
import type { ProfileModalTabId } from './KangurParentDashboardLearnerManagementWidget.types';

type LearnerManagementState = ReturnType<typeof useLearnerManagementState>;
type LearnerRecord = LearnerManagementState['overview']['learners'][number];
type EditStatus = LearnerManagementState['overview']['editForm']['status'];

const resetCreateForm = ({
  actions,
  setShowPassword,
}: {
  actions: LearnerManagementState['actions'];
  setShowPassword: React.Dispatch<React.SetStateAction<boolean>>;
}): void => {
  actions.updateCreateField('displayName', '');
  actions.updateCreateField('age', '');
  actions.updateCreateField('loginName', '');
  actions.updateCreateField('password', '');
  setShowPassword(false);
};

const resetEditForm = ({
  learner,
  actions,
  setShowPassword,
}: {
  learner: LearnerRecord;
  actions: LearnerManagementState['actions'];
  setShowPassword: React.Dispatch<React.SetStateAction<boolean>>;
}): void => {
  actions.updateEditField('displayName', learner.displayName ?? '');
  actions.updateEditField('loginName', learner.loginName ?? '');
  actions.updateEditField('password', '');
  actions.updateEditField('status', learner.status === 'active' ? 'active' : 'disabled');
  setShowPassword(false);
};

const closeTransientEditorState = ({
  actions,
  setIsCreating,
  setIsConfirmingRemove,
}: {
  actions: LearnerManagementState['actions'];
  setIsCreating: LearnerManagementState['setIsCreating'];
  setIsConfirmingRemove: React.Dispatch<React.SetStateAction<boolean>>;
}): void => {
  actions.setCreateLearnerModalOpen(false);
  setIsCreating(false);
  setIsConfirmingRemove(false);
};

const selectCreateOrEditField = ({
  isCreateModalVisible,
  actions,
  field,
  value,
}: {
  isCreateModalVisible: boolean;
  actions: LearnerManagementState['actions'];
  field: 'displayName' | 'loginName' | 'password';
  value: string;
}): void => {
  if (isCreateModalVisible) {
    actions.updateCreateField(field, value);
    return;
  }
  actions.updateEditField(field, value);
};

const openLearnerWithSelection = async ({
  learner,
  actions,
  openLearnerSettings,
}: {
  learner: LearnerRecord;
  actions: LearnerManagementState['actions'];
  openLearnerSettings: (learner: LearnerRecord) => void;
}): Promise<void> => {
  const didSelectLearner = await withKangurClientError(
    {
      source: 'learner-management',
      action: 'select-learner',
      description: 'Switches the active learner before opening learner management settings.',
      context: { learnerId: learner.id },
    },
    async () => {
      await actions.selectLearner(learner.id);
      return true;
    },
    { fallback: false }
  );

  if (!didSelectLearner) return;
  openLearnerSettings(learner);
};

const saveLearnerAndClose = async ({
  isCreateModalVisible,
  actions,
  handleCloseWidgetModal,
}: {
  isCreateModalVisible: boolean;
  actions: LearnerManagementState['actions'];
  handleCloseWidgetModal: () => void;
}): Promise<void> => {
  const didSave = isCreateModalVisible
    ? await actions.handleCreateLearner()
    : await actions.handleSaveLearner();

  if (didSave) {
    handleCloseWidgetModal();
  }
};

const removeActiveLearnerAndClose = async ({
  activeProfile,
  actions,
  handleCloseWidgetModal,
}: {
  activeProfile: LearnerManagementState['activeProfile'];
  actions: LearnerManagementState['actions'];
  handleCloseWidgetModal: () => void;
}): Promise<void> => {
  if (!activeProfile) return;

  const didDelete = await actions.handleDeleteLearner(activeProfile.id);
  if (didDelete) {
    handleCloseWidgetModal();
  }
};

const loadMoreLearnerSessions = ({
  activeProfileId,
  sessions,
  fetchSessions,
}: {
  activeProfileId: LearnerManagementState['activeProfileId'];
  sessions: LearnerManagementState['sessions'];
  fetchSessions: LearnerManagementState['fetchSessions'];
}): void => {
  if (!activeProfileId || sessions?.nextOffset == null) return;
  void fetchSessions(activeProfileId, sessions.nextOffset);
};

const openActiveLearnerSettings = ({
  activeLearner,
  openLearnerSettings,
}: {
  activeLearner: LearnerManagementState['overview']['activeLearner'];
  openLearnerSettings: (learner: LearnerRecord) => void;
}): void => {
  if (!activeLearner) return;
  openLearnerSettings(activeLearner);
};

const resolveSelectedLearnerId = ({
  activeProfileId,
  activeLearner,
}: {
  activeProfileId: LearnerManagementState['activeProfileId'];
  activeLearner: LearnerManagementState['overview']['activeLearner'];
}): string | null => activeProfileId ?? activeLearner?.id ?? null;

const resolveIsCreateModalVisible = ({
  isCreateLearnerModalOpen,
  isCreating,
}: {
  isCreateLearnerModalOpen: boolean;
  isCreating: boolean;
}): boolean => isCreateLearnerModalOpen || isCreating;

const resolveHasMoreSessions = (sessions: LearnerManagementState['sessions']): boolean =>
  Boolean(sessions?.nextOffset !== null && sessions?.nextOffset !== undefined);

const resolveModalOpen = ({
  isCreateModalVisible,
  activeProfileId,
}: {
  isCreateModalVisible: boolean;
  activeProfileId: LearnerManagementState['activeProfileId'];
}): boolean => isCreateModalVisible || Boolean(activeProfileId);

export type LearnerManagementRuntime = {
  selectedLearnerId: string | null;
  isCreateModalVisible: boolean;
  hasMoreSessions: boolean;
  modalOpen: boolean;
  showPassword: boolean;
  isConfirmingRemove: boolean;
  handleCreateNew: () => void;
  handleOpenLearner: (learner: LearnerRecord) => Promise<void>;
  handleOpenActiveLearnerSettings: () => void;
  handleCloseWidgetModal: () => void;
  handleDisplayNameChange: (nextValue: string) => void;
  handleLoginNameChange: (nextValue: string) => void;
  handlePasswordChange: (nextValue: string) => void;
  handleAgeChange: (nextValue: string) => void;
  handleStatusChange: (nextValue: EditStatus) => void;
  handleTogglePassword: () => void;
  handleCancelRemove: () => void;
  handleConfirmRemove: () => void;
  handleSaveAction: () => void;
  handleStartRemove: () => void;
  handleLoadMoreSessions: () => void;
  activeTab: ProfileModalTabId;
  setActiveTab: React.Dispatch<React.SetStateAction<ProfileModalTabId>>;
  activeProfileId: string | null;
  activeProfile: LearnerManagementState['activeProfile'];
  sessions: LearnerManagementState['sessions'];
};

export function useLearnerManagementWidgetRuntime(state: LearnerManagementState): LearnerManagementRuntime {
  const {
    overview,
    actions,
    activeProfileId,
    activeTab,
    setActiveTab,
    isCreating,
    setIsCreating,
    sessions,
    activeProfile,
    fetchSessions,
    handleOpenSettings,
    handleCloseModal,
  } = state;
  const [showPassword, setShowPassword] = useState(false);
  const [isConfirmingRemove, setIsConfirmingRemove] = useState(false);

  const selectedLearnerId = resolveSelectedLearnerId({
    activeProfileId,
    activeLearner: overview.activeLearner,
  });
  const isCreateModalVisible = resolveIsCreateModalVisible({
    isCreateLearnerModalOpen: overview.isCreateLearnerModalOpen,
    isCreating,
  });
  const hasMoreSessions = resolveHasMoreSessions(sessions);
  const modalOpen = resolveModalOpen({ isCreateModalVisible, activeProfileId });

  const handleCloseWidgetModal = (): void => {
    actions.setCreateLearnerModalOpen(false);
    setShowPassword(false);
    setIsConfirmingRemove(false);
    handleCloseModal();
  };

  const openLearnerSettings = (learner: LearnerRecord): void => {
    closeTransientEditorState({ actions, setIsCreating, setIsConfirmingRemove });
    resetEditForm({ learner, actions, setShowPassword });
    handleOpenSettings(learner.id);
  };

  const handleCreateNew = (): void => {
    resetCreateForm({ actions, setShowPassword });
    actions.setCreateLearnerModalOpen(true);
    setIsCreating(true);
    setActiveTab('settings');
    setIsConfirmingRemove(false);
  };

  const handleOpenLearner = async (learner: LearnerRecord): Promise<void> => {
    await openLearnerWithSelection({ learner, actions, openLearnerSettings });
  };

  const handleOpenActiveLearnerSettings = (): void => {
    openActiveLearnerSettings({
      activeLearner: overview.activeLearner,
      openLearnerSettings,
    });
  };

  const handleSave = async (): Promise<void> => {
    await saveLearnerAndClose({ isCreateModalVisible, actions, handleCloseWidgetModal });
  };

  const handleRemove = async (): Promise<void> => {
    await removeActiveLearnerAndClose({ activeProfile, actions, handleCloseWidgetModal });
  };

  const handleStatusChange = (nextValue: EditStatus): void => {
    actions.updateEditField('status', nextValue);
  };

  const handleLoadMoreSessions = (): void => {
    loadMoreLearnerSessions({ activeProfileId, sessions, fetchSessions });
  };

  return {
    selectedLearnerId,
    isCreateModalVisible,
    hasMoreSessions,
    modalOpen,
    showPassword,
    isConfirmingRemove,
    handleCreateNew,
    handleOpenLearner,
    handleOpenActiveLearnerSettings,
    handleCloseWidgetModal,
    handleDisplayNameChange: (nextValue: string) =>
      selectCreateOrEditField({
        isCreateModalVisible,
        actions,
        field: 'displayName',
        value: nextValue,
      }),
    handleLoginNameChange: (nextValue: string) =>
      selectCreateOrEditField({
        isCreateModalVisible,
        actions,
        field: 'loginName',
        value: nextValue,
      }),
    handlePasswordChange: (nextValue: string) =>
      selectCreateOrEditField({
        isCreateModalVisible,
        actions,
        field: 'password',
        value: nextValue,
      }),
    handleAgeChange: (nextValue: string) => actions.updateCreateField('age', nextValue),
    handleStatusChange,
    handleTogglePassword: () => setShowPassword((current) => !current),
    handleCancelRemove: () => setIsConfirmingRemove(false),
    handleConfirmRemove: () => {
      void handleRemove();
    },
    handleSaveAction: () => {
      void handleSave();
    },
    handleStartRemove: () => setIsConfirmingRemove(true),
    handleLoadMoreSessions,
    activeTab,
    setActiveTab,
    activeProfileId,
    activeProfile,
    sessions,
  };
}

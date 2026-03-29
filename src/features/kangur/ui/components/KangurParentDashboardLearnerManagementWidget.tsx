'use client';

import { Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';

import { cn } from '@/features/kangur/shared/utils';
import { withKangurClientError } from '@/features/kangur/observability/client';
import { KangurDialog } from '@/features/kangur/ui/components/KangurDialog';
import { KangurDialogCloseButton } from '@/features/kangur/ui/components/KangurDialogCloseButton';
import { KangurIconSummaryCardContent } from '@/features/kangur/ui/components/KangurIconSummaryCardContent';
import { KangurIconSummaryOptionCard } from '@/features/kangur/ui/components/KangurIconSummaryOptionCard';
import {
  KangurButton,
  KangurEmptyState,
  KangurPanelIntro,
  KangurPanelStack,
  KangurSelectField,
  KangurStatusChip,
  KangurSummaryPanel,
  KangurTextField,
} from '@/features/kangur/ui/design/primitives';
import {
  KANGUR_SEGMENTED_CONTROL_CLASSNAME,
  KANGUR_STACK_TIGHT_CLASSNAME,
} from '@/features/kangur/ui/design/tokens';
import { useKangurPageContentEntry } from '@/features/kangur/ui/hooks/useKangurPageContent';

import { useLearnerManagementState } from './KangurParentDashboardLearnerManagementWidget.hooks';
import { PROFILE_MODAL_TABS } from './KangurParentDashboardLearnerManagementWidget.utils';

export function KangurParentDashboardLearnerManagementWidget(): React.JSX.Element | null {
  const state = useLearnerManagementState();
  const {
    copy,
    isCoarsePointer,
    overview,
    actions,
    activeProfileId,
    activeTab,
    setActiveTab,
    isCreating,
    setIsCreating,
    sessions,
    isLoadingSessions,
    isLoadingMoreSessions,
    sessionsError,
    sessionsLoadMoreError,
    activeProfile,
    fetchSessions,
    handleOpenSettings,
    handleCloseModal,
  } = state;
  const { entry: learnerManagementContent } = useKangurPageContentEntry(
    'parent-dashboard-learner-management'
  );

  const [showPassword, setShowPassword] = useState(false);
  const [isConfirmingRemove, setIsConfirmingRemove] = useState(false);

  if (!overview.canAccessDashboard) {
    return null;
  }

  const selectedLearnerId = activeProfileId ?? overview.activeLearner?.id ?? null;
  const isCreateModalVisible = overview.isCreateLearnerModalOpen || isCreating;
  const createForm = overview.createForm;
  const editForm = overview.editForm;
  const hasMoreSessions = Boolean(
    sessions?.nextOffset !== null && sessions?.nextOffset !== undefined
  );

  const resetCreateForm = () => {
    actions.updateCreateField('displayName', '');
    actions.updateCreateField('age', '');
    actions.updateCreateField('loginName', '');
    actions.updateCreateField('password', '');
    setShowPassword(false);
  };

  const resetEditForm = (learner: (typeof overview.learners)[number]) => {
    actions.updateEditField('displayName', learner.displayName ?? '');
    actions.updateEditField('loginName', learner.loginName ?? '');
    actions.updateEditField('password', '');
    actions.updateEditField('status', learner.status === 'active' ? 'active' : 'disabled');
    setShowPassword(false);
  };

  const handleCloseWidgetModal = () => {
    actions.setCreateLearnerModalOpen(false);
    setShowPassword(false);
    setIsConfirmingRemove(false);
    handleCloseModal();
  };

  const handleCreateNew = () => {
    resetCreateForm();
    actions.setCreateLearnerModalOpen(true);
    setIsCreating(true);
    setActiveTab('settings');
    setIsConfirmingRemove(false);
  };

  const handleOpenLearner = async (learner: (typeof overview.learners)[number]) => {
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

    actions.setCreateLearnerModalOpen(false);
    setIsCreating(false);
    setIsConfirmingRemove(false);
    resetEditForm(learner);
    handleOpenSettings(learner.id);
  };

  const handleOpenActiveLearnerSettings = () => {
    const learner = overview.activeLearner;
    if (!learner) return;

    actions.setCreateLearnerModalOpen(false);
    setIsCreating(false);
    setIsConfirmingRemove(false);
    resetEditForm(learner);
    handleOpenSettings(learner.id);
  };

  const handleSave = async () => {
    const didSave = isCreateModalVisible
      ? await actions.handleCreateLearner()
      : await actions.handleSaveLearner();

    if (didSave) {
      handleCloseWidgetModal();
    }
  };

  const handleRemove = async () => {
    if (!activeProfile) return;

    const didDelete = await actions.handleDeleteLearner(activeProfile.id);
    if (didDelete) {
      handleCloseWidgetModal();
    }
  };

  return (
    <KangurPanelStack className='w-full'>
      <KangurPanelIntro
        eyebrow={copy.learnerManagementEyebrow}
        title={learnerManagementContent?.title ?? copy.learnerManagementTitle}
        description={learnerManagementContent?.summary ?? copy.learnerManagementDescription}
      />

      <div className='flex justify-end'>
        <KangurButton
          aria-label={copy.learnerProfileSettings}
          title={copy.learnerProfileSettings}
          variant='surface'
          size='sm'
          onClick={handleOpenActiveLearnerSettings}
          disabled={!overview.activeLearner}
          className={isCoarsePointer ? 'h-11 w-11 p-0' : 'h-10 w-10 p-0'}
        >
          <span aria-hidden='true' className='text-lg'>
            ⚙️
          </span>
        </KangurButton>
      </div>

      <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'>
        {overview.learners.map((learner) => {
          const isSelectedProfile = selectedLearnerId === learner.id;

          return (
            <KangurIconSummaryOptionCard
              key={learner.id}
              accent={learner.status === 'active' ? 'emerald' : 'slate'}
              emphasis={isSelectedProfile ? 'accent' : 'neutral'}
              onClick={() => {
                void handleOpenLearner(learner);
              }}
              aria-label={copy.learnerCardAriaLabel(
                learner.displayName,
                learner.status === 'active' ? copy.activeStatus : copy.disabledStatus
              )}
              buttonClassName='h-full'
              data-testid={`parent-dashboard-learner-card-${learner.id}`}
            >
              <KangurIconSummaryCardContent
                aside={
                  learner.status === 'active' ? (
                    <KangurStatusChip accent='emerald' size='sm'>
                      {copy.activeStatus}
                    </KangurStatusChip>
                  ) : (
                    <KangurStatusChip accent='slate' size='sm'>
                      {copy.disabledStatus}
                    </KangurStatusChip>
                  )
                }
                className='w-full flex-col items-start sm:flex-row sm:items-center'
                description={copy.learnerLoginDescription(learner.loginName)}
                footer={isSelectedProfile ? copy.selectedProfileHint : copy.switchProfileHint}
                footerClassName='break-words text-xs font-semibold [color:var(--kangur-page-muted-text)]'
                icon={
                  <div className='flex size-12 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-lg'>
                    {learner.avatarId?.trim() ? '🦘' : '👤'}
                  </div>
                }
                title={learner.displayName}
              />
            </KangurIconSummaryOptionCard>
          );
        })}
        <button
          onClick={handleCreateNew}
          className={cn(
            'flex min-h-[100px] items-center justify-center rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-6 transition hover:border-indigo-300 hover:bg-indigo-50/30 active:scale-[0.98]',
            isCoarsePointer && 'min-h-11 px-4 touch-manipulation select-none'
          )}
        >
          <span className='text-sm font-bold text-slate-500'>{copy.addLearner}</span>
        </button>
      </div>

      <KangurDialog
        open={isCreateModalVisible || !!activeProfileId}
        onOpenChange={(open) => !open && handleCloseWidgetModal()}
      >
        <div
          className='relative flex h-full flex-col max-sm:bg-white'
          data-testid={isCreateModalVisible ? 'parent-create-learner-modal' : undefined}
        >
          <div className='sticky top-0 z-10 flex shrink-0 items-center justify-between border-b border-slate-100 bg-white/80 px-6 py-4 backdrop-blur-md'>
            <div>
              <h2 className='text-lg font-black tracking-tight text-slate-900'>
                {isCreateModalVisible ? copy.createModalTitle : copy.profileSettingsTitle}
              </h2>
              <p className='text-xs font-semibold text-slate-500'>
                {isCreateModalVisible
                  ? copy.createModalDescription
                  : copy.profileSettingsDescription}
              </p>
            </div>
            <KangurDialogCloseButton onClick={handleCloseWidgetModal} />
          </div>

          {!isCreateModalVisible ? (
            <div className='bg-slate-50/50 px-6 pt-4'>
              <div className={KANGUR_SEGMENTED_CONTROL_CLASSNAME} role='tablist'>
                {PROFILE_MODAL_TABS.map((tab) => (
                  <KangurButton
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    variant={activeTab === tab.id ? 'segmentActive' : 'segment'}
                    size='sm'
                    role='tab'
                    aria-selected={activeTab === tab.id}
                    className={isCoarsePointer ? 'min-h-11 flex-1' : 'flex-1'}
                  >
                    {tab.id === 'settings' ? copy.settingsTab : copy.metricsTab}
                  </KangurButton>
                ))}
              </div>
            </div>
          ) : null}

          <div className='flex-1 overflow-y-auto p-6'>
            {activeTab === 'settings' || isCreateModalVisible ? (
              <div className={KANGUR_STACK_TIGHT_CLASSNAME}>
                <KangurTextField
                  aria-label={copy.learnerNameLabel}
                  title={copy.learnerNameLabel}
                  value={isCreateModalVisible ? createForm.displayName : editForm.displayName}
                  onChange={(event) => {
                    const nextValue = event.target.value;
                    if (isCreateModalVisible) {
                      actions.updateCreateField('displayName', nextValue);
                    } else {
                      actions.updateEditField('displayName', nextValue);
                    }
                  }}
                  placeholder={copy.learnerNamePlaceholder}
                />
                <KangurTextField
                  aria-label={copy.loginLabel}
                  title={copy.loginLabel}
                  value={isCreateModalVisible ? createForm.loginName : editForm.loginName}
                  onChange={(event) => {
                    const nextValue = event.target.value;
                    if (isCreateModalVisible) {
                      actions.updateCreateField('loginName', nextValue);
                    } else {
                      actions.updateEditField('loginName', nextValue);
                    }
                  }}
                  placeholder={copy.learnerNicknamePlaceholder}
                />
                {isCreateModalVisible ? (
                  <KangurTextField
                    aria-label={copy.ageLabel}
                    title={copy.ageLabel}
                    inputMode='numeric'
                    value={createForm.age}
                    onChange={(event) => actions.updateCreateField('age', event.target.value)}
                    placeholder={copy.agePlaceholder}
                  />
                ) : null}
                <div className='relative'>
                  <KangurTextField
                    aria-label={
                      isCreateModalVisible ? copy.learnerPasswordLabel : copy.newPasswordOptional
                    }
                    title={
                      isCreateModalVisible ? copy.learnerPasswordLabel : copy.newPasswordOptional
                    }
                    type={showPassword ? 'text' : 'password'}
                    value={isCreateModalVisible ? createForm.password : editForm.password}
                    onChange={(event) => {
                      const nextValue = event.target.value;
                      if (isCreateModalVisible) {
                        actions.updateCreateField('password', nextValue);
                      } else {
                        actions.updateEditField('password', nextValue);
                      }
                    }}
                  />
                  <button
                    type='button'
                    aria-label={showPassword ? copy.hidePassword : copy.showPassword}
                    onClick={() => setShowPassword((current) => !current)}
                    className={cn(
                      'absolute bottom-2 right-3 flex items-center justify-center text-slate-400 hover:text-slate-600 touch-manipulation select-none',
                      isCoarsePointer ? 'h-11 w-11 p-0' : 'h-8 w-8'
                    )}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {!isCreateModalVisible ? (
                  <KangurSelectField
                    aria-label={copy.statusLabel}
                    title={copy.statusLabel}
                    value={editForm.status}
                    onChange={(event) =>
                      actions.updateEditField(
                        'status',
                        event.target.value === 'active' ? 'active' : 'disabled'
                      )
                    }
                  >
                    <option value='active'>{copy.activeStatus}</option>
                    <option value='disabled'>{copy.disabledStatus}</option>
                  </KangurSelectField>
                ) : null}
                {overview.feedback ? (
                  <p className='text-sm [color:var(--kangur-page-muted-text)]'>
                    {overview.feedback}
                  </p>
                ) : null}
                {isConfirmingRemove && !isCreateModalVisible ? (
                  <div
                    className='rounded-2xl border border-rose-200 bg-rose-50/80 p-4'
                    role='alert'
                    aria-live='assertive'
                  >
                    <p className='text-sm font-semibold text-rose-700'>{copy.removalWarning}</p>
                    <div className='mt-4 flex flex-col gap-3 sm:flex-row'>
                      <KangurButton
                        onClick={() => setIsConfirmingRemove(false)}
                        variant='surface'
                        size='sm'
                        className={isCoarsePointer ? 'min-h-11 px-4 touch-manipulation' : undefined}
                      >
                        {copy.cancel}
                      </KangurButton>
                      <KangurButton
                        onClick={() => {
                          void handleRemove();
                        }}
                        variant='warning'
                        size='sm'
                        className={isCoarsePointer ? 'min-h-11 px-4 touch-manipulation' : undefined}
                      >
                        {copy.confirmRemoval}
                      </KangurButton>
                    </div>
                  </div>
                ) : null}
                <div className='mt-6 flex flex-col gap-3'>
                  <KangurButton
                    onClick={() => {
                      void handleSave();
                    }}
                    disabled={overview.isSubmitting}
                    variant='primary'
                    size='lg'
                    className={cn(
                      'w-full',
                      isCoarsePointer && 'min-h-11 px-4 touch-manipulation'
                    )}
                  >
                    {overview.isSubmitting
                      ? copy.loading
                      : isCreateModalVisible
                        ? copy.addLearner
                        : copy.saveLearner}
                  </KangurButton>
                  {!isCreateModalVisible ? (
                    <KangurButton
                      onClick={() => setIsConfirmingRemove(true)}
                      disabled={overview.isSubmitting}
                      variant='ghost'
                      size='sm'
                      className={cn(
                        'text-rose-600 hover:bg-rose-50',
                        isCoarsePointer && 'min-h-11 px-4 touch-manipulation'
                      )}
                    >
                      {copy.removeLearnerProfile}
                    </KangurButton>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className={KANGUR_STACK_TIGHT_CLASSNAME}>
                <section className='rounded-2xl border border-slate-100 bg-slate-50/50 p-4'>
                  <p className='text-xs font-black uppercase tracking-[0.16em] text-slate-500'>
                    {copy.profileDetailsLabel}
                  </p>
                  <p className='mt-1 text-sm text-slate-500'>{copy.profileDetailsDescription}</p>
                  {activeProfile ? (
                    <div className='mt-4 grid gap-3 sm:grid-cols-2'>
                      <div>
                        <p className='text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400'>
                          {copy.currentProfileLabel}
                        </p>
                        <p className='mt-1 text-sm font-semibold text-slate-700'>
                          {activeProfile.displayName}
                        </p>
                      </div>
                      <div>
                        <p className='text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400'>
                          {copy.loginLabel}
                        </p>
                        <p className='mt-1 text-sm font-semibold text-slate-700'>
                          {activeProfile.loginName}
                        </p>
                      </div>
                    </div>
                  ) : null}
                </section>

                <section className='rounded-2xl border border-slate-100 bg-slate-50/50 p-4'>
                  <p className='text-xs font-black uppercase tracking-[0.16em] text-slate-500'>
                    {copy.loginSessionsLabel}
                  </p>
                  <p className='mt-1 text-sm text-slate-500'>{copy.loginSessionsDescription}</p>

                  <div className='mt-4'>
                    {isLoadingSessions ? (
                      <KangurEmptyState
                        accent='indigo'
                        title={copy.sessionsLoadingTitle}
                        description={copy.sessionsLoadingDescription}
                      />
                    ) : sessionsError ? (
                      <KangurEmptyState
                        accent='rose'
                        title={copy.noSessionsError}
                        description={copy.sessionErrorDescription}
                      />
                    ) : sessions?.sessions.length === 0 ? (
                      <KangurEmptyState
                        accent='slate'
                        title={copy.loginSessionsEmptyTitle}
                        description={copy.loginSessionsEmptyDescription}
                      />
                    ) : (
                      <div className='space-y-4'>
                        {sessions?.sessions.map((session, idx) => (
                          <div
                            key={session.id}
                            className='rounded-2xl border border-slate-100 bg-slate-50/50 p-4'
                            data-testid={`parent-profile-session-${session.id}`}
                          >
                            <div className='flex items-center justify-between'>
                              <span className='text-xs font-black uppercase tracking-wider text-slate-400'>
                                {copy.sessionLabel(idx + 1)}
                              </span>
                              <KangurStatusChip
                                accent={session.endedAt ? 'emerald' : 'amber'}
                                size='sm'
                              >
                                {session.endedAt ? copy.sessionCompleted : copy.inProgress}
                              </KangurStatusChip>
                            </div>
                            <div className='mt-2 grid grid-cols-2 gap-4'>
                              <div>
                                <p className='text-[10px] font-bold text-slate-400'>
                                  {copy.startLabel}
                                </p>
                                <p className='text-xs font-semibold text-slate-700'>
                                  {new Date(session.startedAt).toLocaleString()}
                                </p>
                              </div>
                              {session.endedAt ? (
                                <div>
                                  <p className='text-[10px] font-bold text-slate-400'>
                                    {copy.endLabel}
                                  </p>
                                  <p className='text-xs font-semibold text-slate-700'>
                                    {new Date(session.endedAt).toLocaleString()}
                                  </p>
                                </div>
                              ) : null}
                            </div>
                          </div>
                        ))}
                        {hasMoreSessions ? (
                          <KangurButton
                            onClick={() => {
                              if (!activeProfileId || sessions?.nextOffset == null) return;
                              void fetchSessions(activeProfileId, sessions.nextOffset);
                            }}
                            disabled={isLoadingMoreSessions}
                            variant='surface'
                            size='sm'
                            className={cn(
                              'w-full',
                              isCoarsePointer && 'min-h-11 px-4 touch-manipulation'
                            )}
                          >
                            {isLoadingMoreSessions ? copy.loading : copy.loadMoreSessions}
                          </KangurButton>
                        ) : null}
                      </div>
                    )}
                    {sessionsLoadMoreError ? (
                      <KangurSummaryPanel
                        accent='rose'
                        description={sessionsLoadMoreError}
                        padding='sm'
                        tone='accent'
                        className='mt-4'
                        role='alert'
                        aria-live='assertive'
                      />
                    ) : null}
                  </div>
                </section>
              </div>
            )}
          </div>
        </div>
      </KangurDialog>
    </KangurPanelStack>
  );
}

export default KangurParentDashboardLearnerManagementWidget;

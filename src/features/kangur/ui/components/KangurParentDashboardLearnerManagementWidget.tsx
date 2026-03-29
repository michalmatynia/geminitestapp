'use client';

import { Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';

import { KangurDialog } from '@/features/kangur/ui/components/KangurDialog';
import { KangurDialogCloseButton } from '@/features/kangur/ui/components/KangurDialogCloseButton';
import { KangurIconSummaryOptionCard } from '@/features/kangur/ui/components/KangurIconSummaryOptionCard';
import { KangurIconSummaryCardContent } from '@/features/kangur/ui/components/KangurIconSummaryCardContent';
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
import { withKangurClientError } from '@/features/kangur/observability/client';
import {
  KANGUR_STACK_TIGHT_CLASSNAME,
  KANGUR_SEGMENTED_CONTROL_CLASSNAME,
} from '@/features/kangur/ui/design/tokens';

import {
  PROFILE_MODAL_TABS,
} from './KangurParentDashboardLearnerManagementWidget.utils';
import { useLearnerManagementState } from './KangurParentDashboardLearnerManagementWidget.hooks';

export function KangurParentDashboardLearnerManagementWidget(): React.JSX.Element {
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

  const [showPassword, setShowPassword] = useState(false);

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

  const handleCreateNew = () => {
    resetCreateForm();
    setIsCreating(true);
    setActiveTab('settings');
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

    resetEditForm(learner);
    handleOpenSettings(learner.id);
  };

  const handleSave = async () => {
    const didSave = isCreating
      ? await actions.handleCreateLearner()
      : await actions.handleSaveLearner();

    if (didSave) {
      handleCloseModal();
    }
  };

  const handleRemove = async () => {
    if (!activeProfile) return;
    const didDelete = await actions.handleDeleteLearner(activeProfile.id);
    if (didDelete) {
      handleCloseModal();
    }
  };

  const createForm = overview.createForm;
  const editForm = overview.editForm;
  const feedbackMessage = overview.feedback ?? sessionsLoadMoreError;
  const hasMoreSessions = Boolean(sessions?.nextOffset !== null && sessions?.nextOffset !== undefined);

  return (
    <KangurPanelStack className='w-full'>
      <KangurPanelIntro
        eyebrow={copy.learnerManagementEyebrow}
        title={copy.learnerManagementTitle}
        description={copy.learnerManagementDescription}
      />

      <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'>
        {overview.learners.map((learner) => (
          <KangurIconSummaryOptionCard
            key={learner.id}
            accent={learner.status === 'active' ? 'emerald' : 'slate'}
            emphasis={activeProfileId === learner.id ? 'accent' : 'neutral'}
            onClick={() => { void handleOpenLearner(learner); }}
            aria-label={copy.learnerCardAriaLabel(learner.displayName, learner.status === 'active' ? copy.activeStatus : copy.disabledStatus)}
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
              description={copy.learnerLoginDescription(learner.loginName)}
              icon={
                <div className='flex size-12 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-lg'>
                  {learner.avatarId?.trim() ? '🦘' : '👤'}
                </div>
              }
              title={learner.displayName}
            />
          </KangurIconSummaryOptionCard>
        ))}
        <button
          onClick={handleCreateNew}
          className='flex min-h-[100px] items-center justify-center rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-6 transition hover:border-indigo-300 hover:bg-indigo-50/30 active:scale-[0.98]'
        >
          <span className='text-sm font-bold text-slate-500'>{copy.addLearner}</span>
        </button>
      </div>

      <KangurDialog open={isCreating || !!activeProfileId} onOpenChange={(open) => !open && handleCloseModal()}>
        <div className='relative flex h-full flex-col max-sm:bg-white'>
          <div className='sticky top-0 z-10 flex shrink-0 items-center justify-between border-b border-slate-100 bg-white/80 px-6 py-4 backdrop-blur-md'>
            <div>
              <h2 className='text-lg font-black tracking-tight text-slate-900'>{isCreating ? copy.createModalTitle : copy.profileSettingsTitle}</h2>
              <p className='text-xs font-semibold text-slate-500'>{isCreating ? copy.createModalDescription : copy.profileSettingsDescription}</p>
            </div>
            <KangurDialogCloseButton onClick={handleCloseModal} />
          </div>

          {!isCreating && (
            <div className='bg-slate-50/50 px-6 pt-4'>
              <div className={KANGUR_SEGMENTED_CONTROL_CLASSNAME} role='tablist'>
                {PROFILE_MODAL_TABS.map((tab) => (
                  <KangurButton
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    variant={activeTab === tab.id ? 'segmentActive' : 'segment'}
                    size='sm'
                    className={isCoarsePointer ? 'min-h-11 flex-1' : 'flex-1'}
                  >
                    {tab.id === 'settings' ? copy.settingsTab : copy.metricsTab}
                  </KangurButton>
                ))}
              </div>
            </div>
          )}

          <div className='flex-1 overflow-y-auto p-6'>
            {activeTab === 'settings' || isCreating ? (
              <div className={KANGUR_STACK_TIGHT_CLASSNAME}>
                <KangurTextField
                  aria-label={copy.learnerNameLabel}
                  title={copy.learnerNameLabel}
                  value={isCreating ? createForm.displayName : editForm.displayName}
                  onChange={(event) => {
                    const nextValue = event.target.value;
                    if (isCreating) actions.updateCreateField('displayName', nextValue);
                    else actions.updateEditField('displayName', nextValue);
                  }}
                  placeholder={copy.learnerNamePlaceholder}
                />
                <KangurTextField
                  aria-label={copy.loginLabel}
                  title={copy.loginLabel}
                  value={isCreating ? createForm.loginName : editForm.loginName}
                  onChange={(event) => {
                    const nextValue = event.target.value;
                    if (isCreating) actions.updateCreateField('loginName', nextValue);
                    else actions.updateEditField('loginName', nextValue);
                  }}
                  placeholder={copy.learnerNicknamePlaceholder}
                />
                {isCreating ? (
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
                    aria-label={isCreating ? copy.learnerPasswordLabel : copy.newPasswordOptional}
                    title={isCreating ? copy.learnerPasswordLabel : copy.newPasswordOptional}
                    type={showPassword ? 'text' : 'password'}
                    value={isCreating ? createForm.password : editForm.password}
                    onChange={(event) => {
                      const nextValue = event.target.value;
                      if (isCreating) actions.updateCreateField('password', nextValue);
                      else actions.updateEditField('password', nextValue);
                    }}
                  />
                  <button
                    type='button'
                    onClick={() => setShowPassword(!showPassword)}
                    className='absolute bottom-2 right-3 flex h-8 w-8 items-center justify-center text-slate-400 hover:text-slate-600'
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {!isCreating && (
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
                )}
                {feedbackMessage ? (
                  <KangurSummaryPanel
                    accent='rose'
                    description={feedbackMessage}
                    tone='accent'
                    padding='md'
                    className='mt-2'
                  />
                ) : null}
                <div className='mt-6 flex flex-col gap-3'>
                  <KangurButton onClick={() => void handleSave()} disabled={overview.isSubmitting} variant='primary' size='lg' className='w-full'>
                    {overview.isSubmitting ? copy.loading : copy.saveLearner}
                  </KangurButton>
                  {!isCreating && (
                    <KangurButton onClick={() => void handleRemove()} disabled={overview.isSubmitting} variant='ghost' size='sm' className='text-rose-600 hover:bg-rose-50'>
                      {copy.removeLearnerProfile}
                    </KangurButton>
                  )}
                </div>
              </div>
            ) : (
              <div className={KANGUR_STACK_TIGHT_CLASSNAME}>
                {isLoadingSessions ? (
                  <KangurEmptyState accent='indigo' title={copy.sessionsLoadingTitle} description={copy.sessionsLoadingDescription} />
                ) : sessionsError ? (
                  <KangurEmptyState accent='rose' title={copy.noSessionsError} description={copy.sessionErrorDescription} />
                ) : sessions?.sessions.length === 0 ? (
                  <KangurEmptyState accent='slate' title={copy.loginSessionsEmptyTitle} description={copy.loginSessionsEmptyDescription} />
                ) : (
                  <div className='space-y-4'>
                    {sessions?.sessions.map((session, idx) => (
                      <div key={session.id} className='rounded-2xl border border-slate-100 bg-slate-50/50 p-4'>
                        <div className='flex items-center justify-between'>
                          <span className='text-xs font-black uppercase tracking-wider text-slate-400'>{copy.sessionLabel(idx + 1)}</span>
                          <KangurStatusChip accent={session.endedAt ? 'emerald' : 'amber'} size='sm'>
                            {session.endedAt ? copy.sessionCompleted : copy.inProgress}
                          </KangurStatusChip>
                        </div>
                        <div className='mt-2 grid grid-cols-2 gap-4'>
                          <div>
                            <p className='text-[10px] font-bold text-slate-400'>{copy.startLabel}</p>
                            <p className='text-xs font-semibold text-slate-700'>{new Date(session.startedAt).toLocaleString()}</p>
                          </div>
                          {session.endedAt && (
                            <div>
                              <p className='text-[10px] font-bold text-slate-400'>{copy.endLabel}</p>
                              <p className='text-xs font-semibold text-slate-700'>{new Date(session.endedAt).toLocaleString()}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    {hasMoreSessions && (
                      <KangurButton
                        onClick={() => {
                          if (!activeProfileId || sessions?.nextOffset == null) return;
                          void fetchSessions(activeProfileId, sessions.nextOffset);
                        }}
                        disabled={isLoadingMoreSessions}
                        variant='surface'
                        size='sm'
                        className='w-full'
                      >
                        {isLoadingMoreSessions ? copy.loading : copy.loadMoreSessions}
                      </KangurButton>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </KangurDialog>
    </KangurPanelStack>
  );
}

export default KangurParentDashboardLearnerManagementWidget;

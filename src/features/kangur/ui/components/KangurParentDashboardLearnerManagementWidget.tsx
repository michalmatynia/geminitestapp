'use client';

import { Eye, EyeOff, Settings } from 'lucide-react';
import { memo, useId, useState } from 'react';

import { KangurDialog } from '@/features/kangur/ui/components/KangurDialog';
import { KangurDialogCloseButton } from '@/features/kangur/ui/components/KangurDialogCloseButton';
import { KangurDialogMeta } from '@/features/kangur/ui/components/KangurDialogMeta';
import { KangurIconSummaryOptionCard } from '@/features/kangur/ui/components/KangurIconSummaryOptionCard';
import { KangurIconSummaryCardContent } from '@/features/kangur/ui/components/KangurIconSummaryCardContent';
import {
  KangurButton,
  KangurEmptyState,
  KangurGlassPanel,
  KangurIconBadge,
  KangurMetaText,
  KangurPanelIntro,
  KangurPanelRow,
  KangurPanelStack,
  KangurSelectField,
  KangurStatusChip,
  KangurSummaryPanel,
  KangurTextField,
} from '@/features/kangur/ui/design/primitives';
import { cn } from '@/features/kangur/shared/utils';
import { withKangurClientError } from '@/features/kangur/observability/client';
import {
  KANGUR_STACK_COMPACT_CLASSNAME,
  KANGUR_STACK_TIGHT_CLASSNAME,
  KANGUR_SEGMENTED_CONTROL_CLASSNAME,
  KANGUR_TIGHT_ROW_CLASSNAME,
  KANGUR_WIDGET_TITLE_CLASSNAME,
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
    feedback,
    setFeedback,
    isPending,
    setIsPending,
    sessions,
    isLoadingSessions,
    sessionsError,
    activeProfile,
    fetchSessions,
    handleOpenSettings,
    handleCloseModal,
  } = state;

  const [formName, setFormName] = useState('');
  const [formNickname, setFormNickname] = useState('');
  const [formLogin, setFormLogin] = useState('');
  const [formPassword, setFormLoginPassword] = useState('');
  const [formAge, setFormAge] = useState<number | null>(null);
  const [formStatus, setFormStatus] = useState<'active' | 'disabled'>('active');
  const [showPassword, setShowPassword] = useState(false);

  const resetForm = (learner?: (typeof overview.learners)[number]) => {
    setFormName(learner?.displayName ?? '');
    setFormNickname(learner?.loginName ?? '');
    setFormLogin(learner?.loginName ?? '');
    setFormLoginPassword('');
    setFormAge(learner?.age ?? null);
    setFormStatus(learner?.status === 'active' ? 'active' : 'disabled');
    setShowPassword(false);
  };

  const handleCreateNew = () => {
    resetForm();
    setIsCreating(true);
  };

  const handleSave = async () => {
    setIsPending(true);
    setFeedback(null);
    try {
      if (isCreating) {
        await withKangurClientError(
          { source: 'learner-management', action: 'create-learner' },
          async () => {
            await actions.createLearner({
              displayName: formName,
              loginName: formLogin,
              password: formPassword,
              age: formAge ?? undefined,
            });
            return true;
          },
          { onError: (err) => setFeedback({ message: String(err), tone: 'rose' }) }
        );
      } else if (activeProfile) {
        await withKangurClientError(
          { source: 'learner-management', action: 'update-learner' },
          async () => {
            await actions.updateLearner(activeProfile.id, {
              displayName: formName,
              loginName: formLogin,
              password: formPassword || undefined,
              age: formAge ?? undefined,
              status: formStatus,
            });
            return true;
          },
          { onError: (err) => setFeedback({ message: String(err), tone: 'rose' }) }
        );
      }
      handleCloseModal();
    } finally {
      setIsPending(false);
    }
  };

  const handleRemove = async () => {
    if (!activeProfile) return;
    setIsPending(true);
    try {
      await actions.removeLearner(activeProfile.id);
      handleCloseModal();
    } finally {
      setIsPending(false);
    }
  };

  return (
    <KangurPanelStack className='w-full'>
      <KangurPanelIntro eyebrow={copy.learnerManagementEyebrow} title={copy.learnerManagementTitle} relaxed>
        <p className='max-w-2xl text-sm leading-relaxed text-slate-600'>{copy.learnerManagementDescription}</p>
      </KangurPanelIntro>

      <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'>
        {overview.learners.map((learner) => (
          <KangurIconSummaryOptionCard
            key={learner.id}
            active={false}
            onClick={() => {
              resetForm(learner);
              handleOpenSettings(learner.id);
            }}
            aria-label={copy.learnerCardAriaLabel(learner.displayName, learner.status === 'active' ? copy.activeStatus : copy.disabledStatus)}
          >
            <KangurIconSummaryCardContent
              title={learner.displayName}
              description={copy.learnerLoginDescription(learner.loginName)}
              badge={learner.status === 'active' ? <KangurStatusChip accent='emerald' size='sm'>{copy.activeStatus}</KangurStatusChip> : <KangurStatusChip accent='slate' size='sm'>{copy.disabledStatus}</KangurStatusChip>}
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
                <KangurTextField label={copy.learnerNameLabel} value={formName} onChange={(e) => setFormName(e.target.value)} placeholder={copy.learnerNamePlaceholder} />
                <KangurTextField label={copy.loginLabel} value={formLogin} onChange={(e) => setFormLogin(e.target.value)} placeholder={copy.learnerNicknamePlaceholder} />
                <div className='relative'>
                  <KangurTextField
                    label={isCreating ? copy.learnerPasswordLabel : copy.newPasswordOptional}
                    type={showPassword ? 'text' : 'password'}
                    value={formPassword}
                    onChange={(e) => setFormLoginPassword(e.target.value)}
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
                    label={copy.statusLabel}
                    value={formStatus}
                    onChange={(val) => setFormStatus(val as any)}
                    options={[
                      { value: 'active', label: copy.activeStatus },
                      { value: 'disabled', label: copy.disabledStatus },
                    ]}
                  />
                )}
                {feedback && <KangurSummaryPanel accent={feedback.tone} description={feedback.message} tone='accent' padding='sm' className='mt-2' />}
                <div className='mt-6 flex flex-col gap-3'>
                  <KangurButton onClick={handleSave} disabled={isPending} variant='primary' size='lg' className='w-full'>
                    {isPending ? copy.loading : copy.saveLearner}
                  </KangurButton>
                  {!isCreating && (
                    <KangurButton onClick={handleRemove} disabled={isPending} variant='ghost' size='sm' className='text-rose-600 hover:bg-rose-50'>
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
                    {sessions?.hasMore && (
                      <KangurButton onClick={() => activeProfileId && fetchSessions(activeProfileId, sessions.nextCursor)} variant='surface' size='sm' className='w-full'>
                        {copy.loadMoreSessions}
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

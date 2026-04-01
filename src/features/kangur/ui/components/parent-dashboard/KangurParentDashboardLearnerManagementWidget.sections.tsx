'use client';

import { Eye, EyeOff } from 'lucide-react';
import type React from 'react';

import { cn } from '@/features/kangur/shared/utils';
import { KangurDialog } from '@/features/kangur/ui/components/KangurDialog';
import { KangurDialogCloseButton } from '@/features/kangur/ui/components/KangurDialogCloseButton';
import { KangurDialogMeta } from '@/features/kangur/ui/components/KangurDialogMeta';
import { KangurIconSummaryCardContent } from '@/features/kangur/ui/components/summary-cards/KangurIconSummaryCardContent';
import { KangurIconSummaryOptionCard } from '@/features/kangur/ui/components/summary-cards/KangurIconSummaryOptionCard';
import {
  KangurButton,
  KangurEmptyState,
  KangurSelectField,
  KangurStatusChip,
  KangurSummaryPanel,
  KangurTextField,
} from '@/features/kangur/ui/design/primitives';
import {
  KANGUR_SEGMENTED_CONTROL_CLASSNAME,
  KANGUR_STACK_TIGHT_CLASSNAME,
} from '@/features/kangur/ui/design/tokens';

import type { useLearnerManagementState } from './KangurParentDashboardLearnerManagementWidget.hooks';
import type { ProfileModalTabId } from './KangurParentDashboardLearnerManagementWidget.types';
import { PROFILE_MODAL_TABS } from './KangurParentDashboardLearnerManagementWidget.utils';
import { useLearnerManagementContext } from './KangurParentDashboardLearnerManagement.context';

type LearnerManagementWidgetState = ReturnType<typeof useLearnerManagementState>;
type LearnerManagementOverview = LearnerManagementWidgetState['overview'];
type LearnerRecord = LearnerManagementOverview['learners'][number];
type ActiveLearnerRecord = LearnerManagementOverview['activeLearner'];
type ActiveProfileRecord = LearnerManagementWidgetState['activeProfile'];
type SessionHistory = LearnerManagementWidgetState['sessions'];
type SessionRecord = NonNullable<SessionHistory>['sessions'][number];
type CreateFormState = LearnerManagementOverview['createForm'];
type EditFormState = LearnerManagementOverview['editForm'];

const resolveShortcutButtonClassName = (isCoarsePointer: boolean): string =>
  isCoarsePointer ? 'h-11 w-11 p-0' : 'h-10 w-10 p-0';

const resolveLearnerCardAccent = (learner: LearnerRecord): 'emerald' | 'slate' =>
  learner.status === 'active' ? 'emerald' : 'slate';

const resolveLearnerCardStatusLabel = (
  learner: LearnerRecord,
  copy: LearnerManagementWidgetState['copy']
): string => (learner.status === 'active' ? copy.activeStatus : copy.disabledStatus);

const resolveLearnerCardFooter = (
  isSelectedProfile: boolean,
  copy: LearnerManagementWidgetState['copy']
): string => (isSelectedProfile ? copy.selectedProfileHint : copy.switchProfileHint);

const resolvePasswordFieldLabel = (
  isCreateModalVisible: boolean,
  copy: LearnerManagementWidgetState['copy']
): string => (isCreateModalVisible ? copy.learnerPasswordLabel : copy.newPasswordOptional);

const resolveSubmitButtonLabel = ({
  isSubmitting,
  isCreateModalVisible,
  copy,
}: {
  isSubmitting: boolean;
  isCreateModalVisible: boolean;
  copy: LearnerManagementWidgetState['copy'];
}): string => {
  if (isSubmitting) return copy.loading;
  return isCreateModalVisible ? copy.addLearner : copy.saveLearner;
};

const resolveSessionStatusAccent = (session: SessionRecord): 'emerald' | 'amber' =>
  session.endedAt ? 'emerald' : 'amber';

const resolveSessionStatusLabel = (
  session: SessionRecord,
  copy: LearnerManagementWidgetState['copy']
): string => (session.endedAt ? copy.sessionCompleted : copy.inProgress);

function LearnerCardStatusChip(props: {
  learner: LearnerRecord;
}): React.JSX.Element {
  const { state } = useLearnerManagementContext();
  const { copy } = state;

  return (
    <KangurStatusChip accent={resolveLearnerCardAccent(props.learner)} size='sm'>
      {resolveLearnerCardStatusLabel(props.learner, copy)}
    </KangurStatusChip>
  );
}

function LearnerCardAvatar(props: { learner: LearnerRecord }): React.JSX.Element {
  return (
    <div className='flex size-12 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-lg'>
      {props.learner.avatarId?.trim() ? '🦘' : '👤'}
    </div>
  );
}

export function LearnerManagementSettingsShortcut(): React.JSX.Element {
  const { state, runtime } = useLearnerManagementContext();
  const { copy, isCoarsePointer, overview } = state;
  const { handleOpenActiveLearnerSettings } = runtime;

  return (
    <div className='flex justify-end'>
      <KangurButton
        aria-label={copy.learnerProfileSettings}
        title={copy.learnerProfileSettings}
        variant='surface'
        size='sm'
        onClick={handleOpenActiveLearnerSettings}
        disabled={!overview.activeLearner}
        className={resolveShortcutButtonClassName(isCoarsePointer)}
      >
        <span aria-hidden='true' className='text-lg'>
          ⚙️
        </span>
      </KangurButton>
    </div>
  );
}

export function LearnerManagementCardsGrid(): React.JSX.Element {
  const { state, runtime } = useLearnerManagementContext();
  const { copy, isCoarsePointer, overview } = state;
  const {
    selectedLearnerId,
    handleOpenLearner,
    handleCreateNew,
  } = runtime;

  return (
    <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'>
      {overview.learners.map((learner) => {
        const isSelectedProfile = selectedLearnerId === learner.id;

        return (
          <KangurIconSummaryOptionCard
            key={learner.id}
            accent={resolveLearnerCardAccent(learner)}
            emphasis={isSelectedProfile ? 'accent' : 'neutral'}
            onClick={() => {
              void handleOpenLearner(learner);
            }}
            aria-label={copy.learnerCardAriaLabel(
              learner.displayName,
              resolveLearnerCardStatusLabel(learner, copy)
            )}
            buttonClassName='h-full'
            data-testid={`parent-dashboard-learner-card-${learner.id}`}
          >
            <KangurIconSummaryCardContent
              aside={<LearnerCardStatusChip learner={learner} copy={copy} />}
              className='w-full flex-col items-start sm:flex-row sm:items-center'
              description={copy.learnerLoginDescription(learner.loginName)}
              footer={resolveLearnerCardFooter(isSelectedProfile, copy)}
              footerClassName='break-words text-xs font-semibold [color:var(--kangur-page-muted-text)]'
              icon={<LearnerCardAvatar learner={learner} />}
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
  );
}

function LearnerManagementModalHeader(): React.JSX.Element {
  const { state, runtime } = useLearnerManagementContext();
  const { copy } = state;
  const { isCreateModalVisible, handleCloseWidgetModal } = runtime;

  return (
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
  );
}

function LearnerManagementModalTabs(): React.JSX.Element {
  const { state, runtime } = useLearnerManagementContext();
  const { copy, isCoarsePointer } = state;
  const { activeTab, setActiveTab } = runtime;

  return (
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
  );
}

function LearnerPasswordField(props: {
  value: string;
  onChange: (nextValue: string) => void;
}): React.JSX.Element {
  const { state, runtime } = useLearnerManagementContext();
  const { copy, isCoarsePointer } = state;
  const { isCreateModalVisible, showPassword, handleTogglePassword } = runtime;
  const passwordFieldLabel = resolvePasswordFieldLabel(isCreateModalVisible, copy);

  return (
    <div className='relative'>
      <KangurTextField
        aria-label={passwordFieldLabel}
        title={passwordFieldLabel}
        type={showPassword ? 'text' : 'password'}
        value={props.value}
        onChange={(event) => props.onChange(event.target.value)}
      />
      <button
        type='button'
        aria-label={showPassword ? copy.hidePassword : copy.showPassword}
        onClick={handleTogglePassword}
        className={cn(
          'absolute bottom-2 right-3 flex items-center justify-center text-slate-400 hover:text-slate-600 touch-manipulation select-none',
          isCoarsePointer ? 'h-11 w-11 p-0' : 'h-8 w-8'
        )}
      >
        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
}

function LearnerStatusField(props: {
  value: EditFormState['status'];
  onChange: (nextValue: EditFormState['status']) => void;
}): React.JSX.Element {
  const { state } = useLearnerManagementContext();
  const { copy } = state;

  return (
    <KangurSelectField
      aria-label={copy.statusLabel}
      title={copy.statusLabel}
      value={props.value}
      onChange={(event) => props.onChange(event.target.value === 'active' ? 'active' : 'disabled')}
    >
      <option value='active'>{copy.activeStatus}</option>
      <option value='disabled'>{copy.disabledStatus}</option>
    </KangurSelectField>
  );
}

function LearnerFeedbackText(): React.JSX.Element | null {
  const { state } = useLearnerManagementContext();
  const { overview } = state;
  const { feedback } = overview;

  if (!feedback) return null;

  return <p className='text-sm [color:var(--kangur-page-muted-text)]'>{feedback}</p>;
}

function LearnerRemovalConfirmation(): React.JSX.Element | null {
  const { state, runtime } = useLearnerManagementContext();
  const { copy, isCoarsePointer } = state;
  const { isConfirmingRemove, isCreateModalVisible, handleCancelRemove, handleConfirmRemove } = runtime;

  if (!isConfirmingRemove || isCreateModalVisible) return null;

  return (
    <div
      className='rounded-2xl border border-rose-200 bg-rose-50/80 p-4'
      role='alert'
      aria-live='assertive'
    >
      <p className='text-sm font-semibold text-rose-700'>{copy.removalWarning}</p>
      <div className='mt-4 flex flex-col gap-3 sm:flex-row'>
        <KangurButton
          onClick={handleCancelRemove}
          variant='surface'
          size='sm'
          className={isCoarsePointer ? 'min-h-11 px-4 touch-manipulation' : undefined}
        >
          {copy.cancel}
        </KangurButton>
        <KangurButton
          onClick={handleConfirmRemove}
          variant='warning'
          size='sm'
          className={isCoarsePointer ? 'min-h-11 px-4 touch-manipulation' : undefined}
        >
          {copy.confirmRemoval}
        </KangurButton>
      </div>
    </div>
  );
}

function LearnerSettingsActions(): React.JSX.Element {
  const { state, runtime } = useLearnerManagementContext();
  const { copy, isCoarsePointer, overview } = state;
  const { isCreateModalVisible, handleSaveAction, handleStartRemove } = runtime;
  const { isSubmitting } = overview;

  return (
    <div className='mt-6 flex flex-col gap-3'>
      <KangurButton
        onClick={handleSaveAction}
        disabled={isSubmitting}
        variant='primary'
        size='lg'
        className={cn('w-full', isCoarsePointer && 'min-h-11 px-4 touch-manipulation')}
      >
        {resolveSubmitButtonLabel({
          isSubmitting,
          isCreateModalVisible,
          copy,
        })}
      </KangurButton>
      {isCreateModalVisible ? null : (
        <KangurButton
          onClick={handleStartRemove}
          disabled={isSubmitting}
          variant='ghost'
          size='sm'
          className={cn(
            'text-rose-600 hover:bg-rose-50',
            isCoarsePointer && 'min-h-11 px-4 touch-manipulation'
          )}
        >
          {copy.removeLearnerProfile}
        </KangurButton>
      )}
    </div>
  );
}

function LearnerSettingsPanel(): React.JSX.Element {
  const { state, runtime } = useLearnerManagementContext();
  const { copy, isCoarsePointer, overview } = state;
  const {
    isCreateModalVisible,
    showPassword,
    isConfirmingRemove,
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
  } = runtime;

  const { createForm, editForm, feedback, isSubmitting } = overview;

  return (
    <div className={KANGUR_STACK_TIGHT_CLASSNAME}>
      <KangurTextField
        aria-label={copy.learnerNameLabel}
        title={copy.learnerNameLabel}
        value={isCreateModalVisible ? createForm.displayName : editForm.displayName}
        onChange={(event) => handleDisplayNameChange(event.target.value)}
        placeholder={copy.learnerNamePlaceholder}
      />
      <KangurTextField
        aria-label={copy.loginLabel}
        title={copy.loginLabel}
        value={isCreateModalVisible ? createForm.loginName : editForm.loginName}
        onChange={(event) => handleLoginNameChange(event.target.value)}
        placeholder={copy.learnerNicknamePlaceholder}
      />
      {isCreateModalVisible ? (
        <KangurTextField
          aria-label={copy.ageLabel}
          title={copy.ageLabel}
          inputMode='numeric'
          value={createForm.age}
          onChange={(event) => handleAgeChange(event.target.value)}
          placeholder={copy.agePlaceholder}
        />
      ) : null}
      <LearnerPasswordField
        value={isCreateModalVisible ? createForm.password : editForm.password}
        onChange={handlePasswordChange}
      />
      {isCreateModalVisible ? null : (
        <LearnerStatusField
          value={editForm.status}
          onChange={handleStatusChange}
        />
      )}
      <LearnerFeedbackText />
      <LearnerRemovalConfirmation />
      <LearnerSettingsActions />
    </div>
  );
}

function LearnerProfileDetailsCard(): React.JSX.Element {
  const { state, runtime } = useLearnerManagementContext();
  const { copy } = state;
  const { activeProfile } = runtime;

  return (
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
  );
}

function LearnerSessionItem(props: {
  index: number;
  session: SessionRecord;
}): React.JSX.Element {
  const { state } = useLearnerManagementContext();
  const { copy } = state;

  return (
    <div
      className='rounded-2xl border border-slate-100 bg-slate-50/50 p-4'
      data-testid={`parent-profile-session-${props.session.id}`}
    >
      <div className='flex items-center justify-between'>
        <span className='text-xs font-black uppercase tracking-wider text-slate-400'>
          {copy.sessionLabel(props.index + 1)}
        </span>
        <KangurStatusChip accent={resolveSessionStatusAccent(props.session)} size='sm'>
          {resolveSessionStatusLabel(props.session, copy)}
        </KangurStatusChip>
      </div>
      <div className='mt-2 grid grid-cols-2 gap-4'>
        <div>
          <p className='text-[10px] font-bold text-slate-400'>{copy.startLabel}</p>
          <p className='text-xs font-semibold text-slate-700'>
            {new Date(props.session.startedAt).toLocaleString()}
          </p>
        </div>
        {props.session.endedAt ? (
          <div>
            <p className='text-[10px] font-bold text-slate-400'>{copy.endLabel}</p>
            <p className='text-xs font-semibold text-slate-700'>
              {new Date(props.session.endedAt).toLocaleString()}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function LearnerSessionsList(): React.JSX.Element {
  const { state, runtime } = useLearnerManagementContext();
  const { copy, isCoarsePointer, isLoadingMoreSessions } = state;
  const { sessions, hasMoreSessions, selectedLearnerId, handleLoadMoreSessions } = runtime;

  return (
    <div className='space-y-4'>
      {sessions?.sessions.map((session, index) => (
        <LearnerSessionItem
          key={session.id}
          index={index}
          session={session}
        />
      ))}
      {hasMoreSessions && selectedLearnerId ? (
        <KangurButton
          onClick={handleLoadMoreSessions}
          disabled={isLoadingMoreSessions}
          variant='surface'
          size='sm'
          className={cn('w-full', isCoarsePointer && 'min-h-11 px-4 touch-manipulation')}
        >
          {isLoadingMoreSessions ? copy.loading : copy.loadMoreSessions}
        </KangurButton>
      ) : null}
    </div>
  );
}

function LearnerSessionsContent(): React.JSX.Element {
  const { state, runtime } = useLearnerManagementContext();
  const {
    copy,
    isLoadingSessions,
    sessionsError,
    sessionsLoadMoreError,
  } = state;
  const { sessions } = runtime;

  return (
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
      ) : sessions ? (
        <LearnerSessionsList />
      ) : null}
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
  );
}

function LearnerSessionsCard(): React.JSX.Element {
  const { state } = useLearnerManagementContext();
  const { copy } = state;

  return (
    <section className='rounded-2xl border border-slate-100 bg-slate-50/50 p-4'>
      <p className='text-xs font-black uppercase tracking-[0.16em] text-slate-500'>
        {copy.loginSessionsLabel}
      </p>
      <p className='mt-1 text-sm text-slate-500'>{copy.loginSessionsDescription}</p>
      <LearnerSessionsContent />
    </section>
  );
}

function LearnerMetricsPanel(): React.JSX.Element {
  return (
    <div className={KANGUR_STACK_TIGHT_CLASSNAME}>
      <LearnerProfileDetailsCard />
      <LearnerSessionsCard />
    </div>
  );
}

export function LearnerManagementModal(): React.JSX.Element {
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

  const showSettingsPanel = activeTab === 'settings' || isCreateModalVisible;
  const dialogTitle = isCreateModalVisible
    ? copy.createModalTitle
    : copy.profileSettingsTitle;
  const dialogDescription = isCreateModalVisible
    ? copy.createModalDescription
    : copy.profileSettingsDescription;

  return (
    <KangurDialog open={modalOpen} onOpenChange={(open) => !open && handleCloseWidgetModal()}>
      <KangurDialogMeta title={dialogTitle} description={dialogDescription} />
      <div
        className='relative flex h-full flex-col max-sm:bg-white'
        data-testid={isCreateModalVisible ? 'parent-create-learner-modal' : undefined}
      >
        <LearnerManagementModalHeader
          copy={copy}
          isCreateModalVisible={isCreateModalVisible}
          onClose={handleCloseWidgetModal}
        />

        {isCreateModalVisible ? null : (
          <LearnerManagementModalTabs
            activeTab={activeTab}
            copy={copy}
            isCoarsePointer={isCoarsePointer}
            onSelectTab={setActiveTab}
          />
        )}

        <div className='flex-1 overflow-y-auto p-6'>
          {showSettingsPanel ? (
            <LearnerSettingsPanel />
          ) : (
            <LearnerMetricsPanel />
          )}
        </div>
      </div>
    </KangurDialog>
  );
}

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
  copy: LearnerManagementWidgetState['copy'];
}): React.JSX.Element {
  return (
    <KangurStatusChip accent={resolveLearnerCardAccent(props.learner)} size='sm'>
      {resolveLearnerCardStatusLabel(props.learner, props.copy)}
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

export function LearnerManagementSettingsShortcut(props: {
  copy: LearnerManagementWidgetState['copy'];
  isCoarsePointer: boolean;
  activeLearner: ActiveLearnerRecord;
  onOpenActiveLearnerSettings: () => void;
}): React.JSX.Element {
  return (
    <div className='flex justify-end'>
      <KangurButton
        aria-label={props.copy.learnerProfileSettings}
        title={props.copy.learnerProfileSettings}
        variant='surface'
        size='sm'
        onClick={props.onOpenActiveLearnerSettings}
        disabled={!props.activeLearner}
        className={resolveShortcutButtonClassName(props.isCoarsePointer)}
      >
        <span aria-hidden='true' className='text-lg'>
          ⚙️
        </span>
      </KangurButton>
    </div>
  );
}

export function LearnerManagementCardsGrid(props: {
  learners: LearnerRecord[];
  selectedLearnerId: string | null;
  copy: LearnerManagementWidgetState['copy'];
  isCoarsePointer: boolean;
  onOpenLearner: (learner: LearnerRecord) => Promise<void>;
  onCreateNew: () => void;
}): React.JSX.Element {
  return (
    <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'>
      {props.learners.map((learner) => {
        const isSelectedProfile = props.selectedLearnerId === learner.id;

        return (
          <KangurIconSummaryOptionCard
            key={learner.id}
            accent={resolveLearnerCardAccent(learner)}
            emphasis={isSelectedProfile ? 'accent' : 'neutral'}
            onClick={() => {
              void props.onOpenLearner(learner);
            }}
            aria-label={props.copy.learnerCardAriaLabel(
              learner.displayName,
              resolveLearnerCardStatusLabel(learner, props.copy)
            )}
            buttonClassName='h-full'
            data-testid={`parent-dashboard-learner-card-${learner.id}`}
          >
            <KangurIconSummaryCardContent
              aside={<LearnerCardStatusChip learner={learner} copy={props.copy} />}
              className='w-full flex-col items-start sm:flex-row sm:items-center'
              description={props.copy.learnerLoginDescription(learner.loginName)}
              footer={resolveLearnerCardFooter(isSelectedProfile, props.copy)}
              footerClassName='break-words text-xs font-semibold [color:var(--kangur-page-muted-text)]'
              icon={<LearnerCardAvatar learner={learner} />}
              title={learner.displayName}
            />
          </KangurIconSummaryOptionCard>
        );
      })}
      <button
        onClick={props.onCreateNew}
        className={cn(
          'flex min-h-[100px] items-center justify-center rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-6 transition hover:border-indigo-300 hover:bg-indigo-50/30 active:scale-[0.98]',
          props.isCoarsePointer && 'min-h-11 px-4 touch-manipulation select-none'
        )}
      >
        <span className='text-sm font-bold text-slate-500'>{props.copy.addLearner}</span>
      </button>
    </div>
  );
}

function LearnerManagementModalHeader(props: {
  copy: LearnerManagementWidgetState['copy'];
  isCreateModalVisible: boolean;
  onClose: () => void;
}): React.JSX.Element {
  return (
    <div className='sticky top-0 z-10 flex shrink-0 items-center justify-between border-b border-slate-100 bg-white/80 px-6 py-4 backdrop-blur-md'>
      <div>
        <h2 className='text-lg font-black tracking-tight text-slate-900'>
          {props.isCreateModalVisible ? props.copy.createModalTitle : props.copy.profileSettingsTitle}
        </h2>
        <p className='text-xs font-semibold text-slate-500'>
          {props.isCreateModalVisible
            ? props.copy.createModalDescription
            : props.copy.profileSettingsDescription}
        </p>
      </div>
      <KangurDialogCloseButton onClick={props.onClose} />
    </div>
  );
}

function LearnerManagementModalTabs(props: {
  activeTab: ProfileModalTabId;
  copy: LearnerManagementWidgetState['copy'];
  isCoarsePointer: boolean;
  onSelectTab: (tabId: ProfileModalTabId) => void;
}): React.JSX.Element {
  return (
    <div className='bg-slate-50/50 px-6 pt-4'>
      <div className={KANGUR_SEGMENTED_CONTROL_CLASSNAME} role='tablist'>
        {PROFILE_MODAL_TABS.map((tab) => (
          <KangurButton
            key={tab.id}
            onClick={() => props.onSelectTab(tab.id)}
            variant={props.activeTab === tab.id ? 'segmentActive' : 'segment'}
            size='sm'
            role='tab'
            aria-selected={props.activeTab === tab.id}
            className={props.isCoarsePointer ? 'min-h-11 flex-1' : 'flex-1'}
          >
            {tab.id === 'settings' ? props.copy.settingsTab : props.copy.metricsTab}
          </KangurButton>
        ))}
      </div>
    </div>
  );
}

function LearnerPasswordField(props: {
  copy: LearnerManagementWidgetState['copy'];
  isCoarsePointer: boolean;
  isCreateModalVisible: boolean;
  showPassword: boolean;
  value: string;
  onChange: (nextValue: string) => void;
  onTogglePassword: () => void;
}): React.JSX.Element {
  const passwordFieldLabel = resolvePasswordFieldLabel(props.isCreateModalVisible, props.copy);

  return (
    <div className='relative'>
      <KangurTextField
        aria-label={passwordFieldLabel}
        title={passwordFieldLabel}
        type={props.showPassword ? 'text' : 'password'}
        value={props.value}
        onChange={(event) => props.onChange(event.target.value)}
      />
      <button
        type='button'
        aria-label={props.showPassword ? props.copy.hidePassword : props.copy.showPassword}
        onClick={props.onTogglePassword}
        className={cn(
          'absolute bottom-2 right-3 flex items-center justify-center text-slate-400 hover:text-slate-600 touch-manipulation select-none',
          props.isCoarsePointer ? 'h-11 w-11 p-0' : 'h-8 w-8'
        )}
      >
        {props.showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
}

function LearnerStatusField(props: {
  copy: LearnerManagementWidgetState['copy'];
  value: EditFormState['status'];
  onChange: (nextValue: EditFormState['status']) => void;
}): React.JSX.Element {
  return (
    <KangurSelectField
      aria-label={props.copy.statusLabel}
      title={props.copy.statusLabel}
      value={props.value}
      onChange={(event) => props.onChange(event.target.value === 'active' ? 'active' : 'disabled')}
    >
      <option value='active'>{props.copy.activeStatus}</option>
      <option value='disabled'>{props.copy.disabledStatus}</option>
    </KangurSelectField>
  );
}

function LearnerFeedbackText(props: {
  feedback: string | null | undefined;
}): React.JSX.Element | null {
  if (!props.feedback) return null;

  return <p className='text-sm [color:var(--kangur-page-muted-text)]'>{props.feedback}</p>;
}

function LearnerRemovalConfirmation(props: {
  copy: LearnerManagementWidgetState['copy'];
  isCoarsePointer: boolean;
  show: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}): React.JSX.Element | null {
  if (!props.show) return null;

  return (
    <div
      className='rounded-2xl border border-rose-200 bg-rose-50/80 p-4'
      role='alert'
      aria-live='assertive'
    >
      <p className='text-sm font-semibold text-rose-700'>{props.copy.removalWarning}</p>
      <div className='mt-4 flex flex-col gap-3 sm:flex-row'>
        <KangurButton
          onClick={props.onCancel}
          variant='surface'
          size='sm'
          className={props.isCoarsePointer ? 'min-h-11 px-4 touch-manipulation' : undefined}
        >
          {props.copy.cancel}
        </KangurButton>
        <KangurButton
          onClick={props.onConfirm}
          variant='warning'
          size='sm'
          className={props.isCoarsePointer ? 'min-h-11 px-4 touch-manipulation' : undefined}
        >
          {props.copy.confirmRemoval}
        </KangurButton>
      </div>
    </div>
  );
}

function LearnerSettingsActions(props: {
  copy: LearnerManagementWidgetState['copy'];
  isCoarsePointer: boolean;
  isCreateModalVisible: boolean;
  isSubmitting: boolean;
  onSave: () => void;
  onStartRemove: () => void;
}): React.JSX.Element {
  return (
    <div className='mt-6 flex flex-col gap-3'>
      <KangurButton
        onClick={props.onSave}
        disabled={props.isSubmitting}
        variant='primary'
        size='lg'
        className={cn('w-full', props.isCoarsePointer && 'min-h-11 px-4 touch-manipulation')}
      >
        {resolveSubmitButtonLabel({
          isSubmitting: props.isSubmitting,
          isCreateModalVisible: props.isCreateModalVisible,
          copy: props.copy,
        })}
      </KangurButton>
      {props.isCreateModalVisible ? null : (
        <KangurButton
          onClick={props.onStartRemove}
          disabled={props.isSubmitting}
          variant='ghost'
          size='sm'
          className={cn(
            'text-rose-600 hover:bg-rose-50',
            props.isCoarsePointer && 'min-h-11 px-4 touch-manipulation'
          )}
        >
          {props.copy.removeLearnerProfile}
        </KangurButton>
      )}
    </div>
  );
}

function LearnerSettingsPanel(props: {
  copy: LearnerManagementWidgetState['copy'];
  isCoarsePointer: boolean;
  isCreateModalVisible: boolean;
  showPassword: boolean;
  isConfirmingRemove: boolean;
  isSubmitting: boolean;
  createForm: CreateFormState;
  editForm: EditFormState;
  feedback: string | null | undefined;
  onDisplayNameChange: (nextValue: string) => void;
  onLoginNameChange: (nextValue: string) => void;
  onAgeChange: (nextValue: string) => void;
  onPasswordChange: (nextValue: string) => void;
  onStatusChange: (nextValue: EditFormState['status']) => void;
  onTogglePassword: () => void;
  onCancelRemove: () => void;
  onConfirmRemove: () => void;
  onSave: () => void;
  onStartRemove: () => void;
}): React.JSX.Element {
  return (
    <div className={KANGUR_STACK_TIGHT_CLASSNAME}>
      <KangurTextField
        aria-label={props.copy.learnerNameLabel}
        title={props.copy.learnerNameLabel}
        value={props.isCreateModalVisible ? props.createForm.displayName : props.editForm.displayName}
        onChange={(event) => props.onDisplayNameChange(event.target.value)}
        placeholder={props.copy.learnerNamePlaceholder}
      />
      <KangurTextField
        aria-label={props.copy.loginLabel}
        title={props.copy.loginLabel}
        value={props.isCreateModalVisible ? props.createForm.loginName : props.editForm.loginName}
        onChange={(event) => props.onLoginNameChange(event.target.value)}
        placeholder={props.copy.learnerNicknamePlaceholder}
      />
      {props.isCreateModalVisible ? (
        <KangurTextField
          aria-label={props.copy.ageLabel}
          title={props.copy.ageLabel}
          inputMode='numeric'
          value={props.createForm.age}
          onChange={(event) => props.onAgeChange(event.target.value)}
          placeholder={props.copy.agePlaceholder}
        />
      ) : null}
      <LearnerPasswordField
        copy={props.copy}
        isCoarsePointer={props.isCoarsePointer}
        isCreateModalVisible={props.isCreateModalVisible}
        showPassword={props.showPassword}
        value={props.isCreateModalVisible ? props.createForm.password : props.editForm.password}
        onChange={props.onPasswordChange}
        onTogglePassword={props.onTogglePassword}
      />
      {props.isCreateModalVisible ? null : (
        <LearnerStatusField
          copy={props.copy}
          value={props.editForm.status}
          onChange={props.onStatusChange}
        />
      )}
      <LearnerFeedbackText feedback={props.feedback} />
      <LearnerRemovalConfirmation
        copy={props.copy}
        isCoarsePointer={props.isCoarsePointer}
        show={props.isConfirmingRemove && !props.isCreateModalVisible}
        onCancel={props.onCancelRemove}
        onConfirm={props.onConfirmRemove}
      />
      <LearnerSettingsActions
        copy={props.copy}
        isCoarsePointer={props.isCoarsePointer}
        isCreateModalVisible={props.isCreateModalVisible}
        isSubmitting={props.isSubmitting}
        onSave={props.onSave}
        onStartRemove={props.onStartRemove}
      />
    </div>
  );
}

function LearnerProfileDetailsCard(props: {
  copy: LearnerManagementWidgetState['copy'];
  activeProfile: ActiveProfileRecord;
}): React.JSX.Element {
  return (
    <section className='rounded-2xl border border-slate-100 bg-slate-50/50 p-4'>
      <p className='text-xs font-black uppercase tracking-[0.16em] text-slate-500'>
        {props.copy.profileDetailsLabel}
      </p>
      <p className='mt-1 text-sm text-slate-500'>{props.copy.profileDetailsDescription}</p>
      {props.activeProfile ? (
        <div className='mt-4 grid gap-3 sm:grid-cols-2'>
          <div>
            <p className='text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400'>
              {props.copy.currentProfileLabel}
            </p>
            <p className='mt-1 text-sm font-semibold text-slate-700'>
              {props.activeProfile.displayName}
            </p>
          </div>
          <div>
            <p className='text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400'>
              {props.copy.loginLabel}
            </p>
            <p className='mt-1 text-sm font-semibold text-slate-700'>
              {props.activeProfile.loginName}
            </p>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function LearnerSessionItem(props: {
  copy: LearnerManagementWidgetState['copy'];
  index: number;
  session: SessionRecord;
}): React.JSX.Element {
  return (
    <div
      className='rounded-2xl border border-slate-100 bg-slate-50/50 p-4'
      data-testid={`parent-profile-session-${props.session.id}`}
    >
      <div className='flex items-center justify-between'>
        <span className='text-xs font-black uppercase tracking-wider text-slate-400'>
          {props.copy.sessionLabel(props.index + 1)}
        </span>
        <KangurStatusChip accent={resolveSessionStatusAccent(props.session)} size='sm'>
          {resolveSessionStatusLabel(props.session, props.copy)}
        </KangurStatusChip>
      </div>
      <div className='mt-2 grid grid-cols-2 gap-4'>
        <div>
          <p className='text-[10px] font-bold text-slate-400'>{props.copy.startLabel}</p>
          <p className='text-xs font-semibold text-slate-700'>
            {new Date(props.session.startedAt).toLocaleString()}
          </p>
        </div>
        {props.session.endedAt ? (
          <div>
            <p className='text-[10px] font-bold text-slate-400'>{props.copy.endLabel}</p>
            <p className='text-xs font-semibold text-slate-700'>
              {new Date(props.session.endedAt).toLocaleString()}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function LearnerSessionsList(props: {
  copy: LearnerManagementWidgetState['copy'];
  sessions: SessionHistory;
  hasMoreSessions: boolean;
  isLoadingMoreSessions: boolean;
  isCoarsePointer: boolean;
  activeProfileId: string | null;
  onLoadMore: () => void;
}): React.JSX.Element {
  return (
    <div className='space-y-4'>
      {props.sessions?.sessions.map((session, index) => (
        <LearnerSessionItem
          key={session.id}
          copy={props.copy}
          index={index}
          session={session}
        />
      ))}
      {props.hasMoreSessions && props.activeProfileId ? (
        <KangurButton
          onClick={props.onLoadMore}
          disabled={props.isLoadingMoreSessions}
          variant='surface'
          size='sm'
          className={cn('w-full', props.isCoarsePointer && 'min-h-11 px-4 touch-manipulation')}
        >
          {props.isLoadingMoreSessions ? props.copy.loading : props.copy.loadMoreSessions}
        </KangurButton>
      ) : null}
    </div>
  );
}

function LearnerSessionsContent(props: {
  copy: LearnerManagementWidgetState['copy'];
  sessions: SessionHistory;
  sessionsError: string | null;
  sessionsLoadMoreError: string | null;
  isLoadingSessions: boolean;
  hasMoreSessions: boolean;
  isLoadingMoreSessions: boolean;
  isCoarsePointer: boolean;
  activeProfileId: string | null;
  onLoadMore: () => void;
}): React.JSX.Element {
  return (
    <div className='mt-4'>
      {props.isLoadingSessions ? (
        <KangurEmptyState
          accent='indigo'
          title={props.copy.sessionsLoadingTitle}
          description={props.copy.sessionsLoadingDescription}
        />
      ) : props.sessionsError ? (
        <KangurEmptyState
          accent='rose'
          title={props.copy.noSessionsError}
          description={props.copy.sessionErrorDescription}
        />
      ) : props.sessions?.sessions.length === 0 ? (
        <KangurEmptyState
          accent='slate'
          title={props.copy.loginSessionsEmptyTitle}
          description={props.copy.loginSessionsEmptyDescription}
        />
      ) : props.sessions ? (
        <LearnerSessionsList
          copy={props.copy}
          sessions={props.sessions}
          hasMoreSessions={props.hasMoreSessions}
          isLoadingMoreSessions={props.isLoadingMoreSessions}
          isCoarsePointer={props.isCoarsePointer}
          activeProfileId={props.activeProfileId}
          onLoadMore={props.onLoadMore}
        />
      ) : null}
      {props.sessionsLoadMoreError ? (
        <KangurSummaryPanel
          accent='rose'
          description={props.sessionsLoadMoreError}
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

function LearnerSessionsCard(props: {
  copy: LearnerManagementWidgetState['copy'];
  sessions: SessionHistory;
  sessionsError: string | null;
  sessionsLoadMoreError: string | null;
  isLoadingSessions: boolean;
  hasMoreSessions: boolean;
  isLoadingMoreSessions: boolean;
  isCoarsePointer: boolean;
  activeProfileId: string | null;
  onLoadMore: () => void;
}): React.JSX.Element {
  return (
    <section className='rounded-2xl border border-slate-100 bg-slate-50/50 p-4'>
      <p className='text-xs font-black uppercase tracking-[0.16em] text-slate-500'>
        {props.copy.loginSessionsLabel}
      </p>
      <p className='mt-1 text-sm text-slate-500'>{props.copy.loginSessionsDescription}</p>
      <LearnerSessionsContent
        copy={props.copy}
        sessions={props.sessions}
        sessionsError={props.sessionsError}
        sessionsLoadMoreError={props.sessionsLoadMoreError}
        isLoadingSessions={props.isLoadingSessions}
        hasMoreSessions={props.hasMoreSessions}
        isLoadingMoreSessions={props.isLoadingMoreSessions}
        isCoarsePointer={props.isCoarsePointer}
        activeProfileId={props.activeProfileId}
        onLoadMore={props.onLoadMore}
      />
    </section>
  );
}

function LearnerMetricsPanel(props: {
  copy: LearnerManagementWidgetState['copy'];
  activeProfile: ActiveProfileRecord;
  sessions: SessionHistory;
  sessionsError: string | null;
  sessionsLoadMoreError: string | null;
  isLoadingSessions: boolean;
  hasMoreSessions: boolean;
  isLoadingMoreSessions: boolean;
  isCoarsePointer: boolean;
  activeProfileId: string | null;
  onLoadMore: () => void;
}): React.JSX.Element {
  return (
    <div className={KANGUR_STACK_TIGHT_CLASSNAME}>
      <LearnerProfileDetailsCard copy={props.copy} activeProfile={props.activeProfile} />
      <LearnerSessionsCard
        copy={props.copy}
        sessions={props.sessions}
        sessionsError={props.sessionsError}
        sessionsLoadMoreError={props.sessionsLoadMoreError}
        isLoadingSessions={props.isLoadingSessions}
        hasMoreSessions={props.hasMoreSessions}
        isLoadingMoreSessions={props.isLoadingMoreSessions}
        isCoarsePointer={props.isCoarsePointer}
        activeProfileId={props.activeProfileId}
        onLoadMore={props.onLoadMore}
      />
    </div>
  );
}

export function LearnerManagementModal(props: {
  copy: LearnerManagementWidgetState['copy'];
  open: boolean;
  isCreateModalVisible: boolean;
  activeTab: ProfileModalTabId;
  isCoarsePointer: boolean;
  showPassword: boolean;
  isConfirmingRemove: boolean;
  createForm: CreateFormState;
  editForm: EditFormState;
  feedback: string | null | undefined;
  isSubmitting: boolean;
  activeProfileId: string | null;
  activeProfile: ActiveProfileRecord;
  sessions: SessionHistory;
  sessionsError: string | null;
  sessionsLoadMoreError: string | null;
  isLoadingSessions: boolean;
  isLoadingMoreSessions: boolean;
  hasMoreSessions: boolean;
  onClose: () => void;
  onSelectTab: (tabId: ProfileModalTabId) => void;
  onDisplayNameChange: (nextValue: string) => void;
  onLoginNameChange: (nextValue: string) => void;
  onAgeChange: (nextValue: string) => void;
  onPasswordChange: (nextValue: string) => void;
  onStatusChange: (nextValue: EditFormState['status']) => void;
  onTogglePassword: () => void;
  onCancelRemove: () => void;
  onConfirmRemove: () => void;
  onSave: () => void;
  onStartRemove: () => void;
  onLoadMoreSessions: () => void;
}): React.JSX.Element {
  const showSettingsPanel = props.activeTab === 'settings' || props.isCreateModalVisible;
  const dialogTitle = props.isCreateModalVisible
    ? props.copy.createModalTitle
    : props.copy.profileSettingsTitle;
  const dialogDescription = props.isCreateModalVisible
    ? props.copy.createModalDescription
    : props.copy.profileSettingsDescription;

  return (
    <KangurDialog open={props.open} onOpenChange={(open) => !open && props.onClose()}>
      <KangurDialogMeta title={dialogTitle} description={dialogDescription} />
      <div
        className='relative flex h-full flex-col max-sm:bg-white'
        data-testid={props.isCreateModalVisible ? 'parent-create-learner-modal' : undefined}
      >
        <LearnerManagementModalHeader
          copy={props.copy}
          isCreateModalVisible={props.isCreateModalVisible}
          onClose={props.onClose}
        />

        {props.isCreateModalVisible ? null : (
          <LearnerManagementModalTabs
            activeTab={props.activeTab}
            copy={props.copy}
            isCoarsePointer={props.isCoarsePointer}
            onSelectTab={props.onSelectTab}
          />
        )}

        <div className='flex-1 overflow-y-auto p-6'>
          {showSettingsPanel ? (
            <LearnerSettingsPanel
              copy={props.copy}
              isCoarsePointer={props.isCoarsePointer}
              isCreateModalVisible={props.isCreateModalVisible}
              showPassword={props.showPassword}
              isConfirmingRemove={props.isConfirmingRemove}
              isSubmitting={props.isSubmitting}
              createForm={props.createForm}
              editForm={props.editForm}
              feedback={props.feedback}
              onDisplayNameChange={props.onDisplayNameChange}
              onLoginNameChange={props.onLoginNameChange}
              onAgeChange={props.onAgeChange}
              onPasswordChange={props.onPasswordChange}
              onStatusChange={props.onStatusChange}
              onTogglePassword={props.onTogglePassword}
              onCancelRemove={props.onCancelRemove}
              onConfirmRemove={props.onConfirmRemove}
              onSave={props.onSave}
              onStartRemove={props.onStartRemove}
            />
          ) : (
            <LearnerMetricsPanel
              copy={props.copy}
              activeProfile={props.activeProfile}
              sessions={props.sessions}
              sessionsError={props.sessionsError}
              sessionsLoadMoreError={props.sessionsLoadMoreError}
              isLoadingSessions={props.isLoadingSessions}
              hasMoreSessions={props.hasMoreSessions}
              isLoadingMoreSessions={props.isLoadingMoreSessions}
              isCoarsePointer={props.isCoarsePointer}
              activeProfileId={props.activeProfileId}
              onLoadMore={props.onLoadMoreSessions}
            />
          )}
        </div>
      </div>
    </KangurDialog>
  );
}

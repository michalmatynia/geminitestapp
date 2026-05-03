'use client';

import { BrainCircuit } from 'lucide-react';
import React, { createContext, useContext, useId } from 'react';

import {
  type KangurAiTutorHintDepth,
  type KangurAiTutorProactiveNudges,
  type KangurAiTutorTestAccessMode,
  type KangurAiTutorUiMode,
} from '@/features/kangur/ai-tutor/settings';
import { KangurLabeledValueSummary } from '@/features/kangur/ui/components/summary-cards/KangurLabeledValueSummary';
import {
  KangurButton,
  KangurCardDescription,
  KangurCardTitle,
  KangurPanelIntro,
  KangurPanelRow,
  KangurPanelStack,
  KangurSelectField,
  KangurSectionEyebrow,
  KangurStatusChip,
  KangurSurfacePanel,
} from '@/features/kangur/ui/design/primitives';
import {
  KANGUR_STACK_COMPACT_CLASSNAME,
  KANGUR_TIGHT_ROW_CLASSNAME,
} from '@/features/kangur/ui/design/tokens';
import { KANGUR_PARENT_DASHBOARD_ENABLE_TUTOR_BUTTON_CLASSNAME } from './KangurParentDashboardAiTutorWidget.constants';
import type {
  AiTutorConfigPanelState,
} from './KangurParentDashboardAiTutorWidget.types';

const AiTutorConfigPanelContext = createContext<AiTutorConfigPanelState | null>(null);

function useAiTutorConfigPanel(): AiTutorConfigPanelState {
  const context = useContext(AiTutorConfigPanelContext);
  if (!context) {
    throw new Error('useAiTutorConfigPanel must be used within AiTutorConfigPanel.');
  }
  return context;
}

export function TutorToggleField({
  checked,
  description,
  disabled = false,
  label,
  onChange,
}: {
  checked: boolean;
  description: string;
  disabled?: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}): React.JSX.Element {
  const controlId = useId();

  return (
    <label
      htmlFor={controlId}
      aria-label={label}
      className={`flex items-start kangur-panel-gap rounded-2xl border px-3 py-3 transition-colors ${
        disabled
          ? 'cursor-not-allowed [border-color:var(--kangur-soft-card-border)] [background:color-mix(in_srgb,var(--kangur-soft-card-background)_72%,#cbd5e1)] opacity-70'
          : checked
            ? 'cursor-pointer border-amber-200 bg-amber-50/65'
            : 'cursor-pointer [border-color:var(--kangur-soft-card-border)] [background:color-mix(in_srgb,var(--kangur-soft-card-background)_82%,var(--kangur-page-background))]'
      }`}
    >
      <div className='relative mt-0.5'>
        <input
          id={controlId}
          type='checkbox'
          className='sr-only'
          checked={checked}
          disabled={disabled}
          onChange={(event) => onChange(event.target.checked)}
          aria-label={label}
        />
        <div
          className={`h-5 w-10 rounded-full transition-all ${
            checked
              ? 'bg-gradient-to-r kangur-gradient-accent-amber shadow-[0_8px_18px_-14px_rgba(249,115,22,0.72)]'
              : '[background:color-mix(in_srgb,var(--kangur-soft-card-border)_86%,#94a3b8)]'
          }`}
        />
        <div
          className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full [background:var(--kangur-soft-card-background)] shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`}
        />
      </div>
      <div className='min-w-0'>
        <div className='text-sm font-medium [color:var(--kangur-page-text)]'>{label}</div>
        <div className='mt-1 text-xs leading-relaxed [color:var(--kangur-page-muted-text)]'>
          {description}
        </div>
      </div>
    </label>
  );
}

type AiTutorSelectFieldConfig = {
  children: React.ReactNode;
  description: string;
  disabled?: boolean;
  id: string;
  label: string;
  onChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  value: string;
};

export function AiTutorSelectFieldRow({
  config,
}: {
  config: AiTutorSelectFieldConfig;
}): React.JSX.Element {
  const { children, description, disabled = false, id, label, onChange, value } = config;

  return (
    <div className={KANGUR_STACK_COMPACT_CLASSNAME}>
      <label
        htmlFor={id}
        className='text-xs font-semibold [color:var(--kangur-page-muted-text)] uppercase tracking-wide'
      >
        {label}
      </label>
      <KangurSelectField
        id={id}
        value={value}
        onChange={onChange}
        accent='amber'
        size='md'
        disabled={disabled}
      >
        {children}
      </KangurSelectField>
      <p className='text-xs leading-relaxed [color:var(--kangur-page-muted-text)]'>{description}</p>
    </div>
  );
}

export function AiTutorPanelHeader({
  title,
}: {
  title: string;
}): React.JSX.Element {
  const { sectionSummary, sectionTitle } = useAiTutorConfigPanel();

  return (
    <KangurPanelRow className='items-start sm:items-center'>
      <BrainCircuit aria-hidden='true' className='h-5 w-5 text-orange-500' />
      <KangurPanelIntro
        className='min-w-0'
        description={sectionSummary}
        descriptionClassName='text-xs'
        eyebrow={sectionTitle}
        eyebrowClassName='tracking-[0.18em]'
        title={title}
        titleClassName='mt-1 text-sm font-bold'
      />
    </KangurPanelRow>
  );
}

export function AiTutorNoActiveLearnerPanel(): React.JSX.Element {
  const state = useAiTutorConfigPanel();
  return (
    <KangurSurfacePanel accent='amber' padding='lg' className='w-full'>
      <KangurPanelStack>
        <AiTutorPanelHeader
          title={state.tutorContent.parentDashboard.noActiveLearner}
        />
        {state.isTutorHidden ? (
          <KangurButton
            className={`${state.actionClasses.compactActionClassName} ${KANGUR_PARENT_DASHBOARD_ENABLE_TUTOR_BUTTON_CLASSNAME}`}
            onClick={state.handleRestoreTutor}
            size='sm'
            variant='surface'
            data-testid='parent-dashboard-ai-tutor-enable'
          >
            {state.enableTutorLabel}
          </KangurButton>
        ) : null}
      </KangurPanelStack>
    </KangurSurfacePanel>
  );
}

export function AiTutorMoodSection(): React.JSX.Element {
  const { tutorContent, moodPresentation: presentation } = useAiTutorConfigPanel();
  const { parentDashboard: parentDashboardContent } = tutorContent;
  return (
    <div
      className='rounded-2xl border border-emerald-100 bg-emerald-50/70 px-4 py-3'
      data-testid='parent-dashboard-ai-tutor-mood'
    >
      <KangurPanelRow className='sm:items-start sm:justify-between'>
        <div className='min-w-0'>
          <KangurSectionEyebrow className='text-xs tracking-wide text-emerald-700'>
            {parentDashboardContent.moodTitle}
          </KangurSectionEyebrow>
          <KangurCardDescription
            as='p'
            className='mt-1 leading-relaxed'
            data-testid='parent-dashboard-ai-tutor-mood-description'
            size='sm'
          >
            {presentation.currentMoodDescription}
          </KangurCardDescription>
        </div>
        <KangurStatusChip
          accent={presentation.currentMoodAccent}
          className='w-fit self-start sm:self-auto'
          data-mood-id={presentation.currentMoodId}
          data-testid='parent-dashboard-ai-tutor-mood-current'
        >
          {presentation.currentMoodLabel}
        </KangurStatusChip>
      </KangurPanelRow>

      <div className='mt-3 grid kangur-panel-gap text-xs [color:var(--kangur-page-muted-text)] min-[420px]:grid-cols-2 lg:grid-cols-3'>
        <KangurLabeledValueSummary
          label={parentDashboardContent.baselineLabel}
          labelClassName='text-xs tracking-wide'
          value={presentation.baselineMoodLabel}
          valueClassName='mt-1'
          valueTestId='parent-dashboard-ai-tutor-mood-baseline'
        />
        <KangurLabeledValueSummary
          label={parentDashboardContent.confidenceLabel}
          labelClassName='text-xs tracking-wide'
          value={presentation.moodConfidence}
          valueClassName='mt-1'
          valueTestId='parent-dashboard-ai-tutor-mood-confidence'
        />
        <KangurLabeledValueSummary
          label={parentDashboardContent.updatedLabel}
          labelClassName='text-xs tracking-wide'
          value={presentation.moodUpdatedAt}
          valueClassName='mt-1'
          valueTestId='parent-dashboard-ai-tutor-mood-updated'
        />
      </div>
    </div>
  );
}

export function AiTutorUsageSection(): React.JSX.Element | null {
  const { tutorContent, usagePresentation: presentation } = useAiTutorConfigPanel();
  const { parentDashboard: parentDashboardContent } = tutorContent;
  if (!presentation.showUsage) {
    return null;
  }

  return (
    <div className='rounded-2xl border border-amber-100 bg-amber-50/75 px-4 py-3'>
      <KangurPanelRow className='items-start sm:justify-between'>
        <div className='min-w-0'>
          <KangurSectionEyebrow className='text-xs tracking-wide text-amber-700'>
            {parentDashboardContent.usageTitle}
          </KangurSectionEyebrow>
          <KangurCardTitle className='mt-1'>{presentation.summaryText}</KangurCardTitle>
        </div>
        {presentation.showBadge ? (
          <div className='rounded-full [background:color-mix(in_srgb,var(--kangur-soft-card-background)_90%,#ffffff)] px-3 py-1 text-xs font-semibold text-amber-700 sm:shrink-0'>
            {presentation.badgeText}
          </div>
        ) : null}
      </KangurPanelRow>
      <KangurCardDescription as='p' className='mt-2 leading-relaxed' size='xs'>
        {parentDashboardContent.usageHelp}
      </KangurCardDescription>
    </div>
  );
}

export function AiTutorAvailabilityRow(): React.JSX.Element {
  const {
    actionClasses,
    formBindings,
    handleToggleEnabled,
    isTemporarilyDisabled,
    tutorContent,
  } = useAiTutorConfigPanel();
  const { parentDashboard: parentDashboardContent } = tutorContent;
  const { compactActionClassName } = actionClasses;
  const { enabled } = formBindings.formState;

  return (
    <div className={`${KANGUR_TIGHT_ROW_CLASSNAME} sm:items-center sm:justify-between`}>
      <span className='text-sm font-medium [color:var(--kangur-page-text)]'>
        {enabled
          ? parentDashboardContent.toggleEnabledLabel
          : parentDashboardContent.toggleDisabledLabel}
      </span>
      <KangurButton
        className={compactActionClassName}
        onClick={handleToggleEnabled}
        size='sm'
        variant={enabled ? 'surface' : 'primary'}
        disabled={isTemporarilyDisabled}
      >
        {enabled
          ? parentDashboardContent.toggleDisableActionLabel
          : parentDashboardContent.toggleEnableActionLabel}
      </KangurButton>
    </div>
  );
}

export function AiTutorGuardrailsSection(): React.JSX.Element {
  const {
    controlsDisabled,
    formBindings,
    hintDepthFieldId,
    proactiveNudgesFieldId,
    testAccessModeFieldId,
    tutorContent,
  } = useAiTutorConfigPanel();
  const { parentDashboard: parentDashboardContent } = tutorContent;

  return (
    <div className='space-y-3'>
      <KangurSectionEyebrow className='text-xs tracking-wide'>
        {parentDashboardContent.guardrailsTitle}
      </KangurSectionEyebrow>
      <TutorToggleField
        checked={formBindings.formState.allowLessons}
        disabled={controlsDisabled}
        label={parentDashboardContent.toggles.allowLessonsLabel}
        description={parentDashboardContent.toggles.allowLessonsDescription}
        onChange={formBindings.setAllowLessons}
      />
      <TutorToggleField
        checked={formBindings.formState.allowGames}
        disabled={controlsDisabled}
        label={parentDashboardContent.toggles.allowGamesLabel}
        description={parentDashboardContent.toggles.allowGamesDescription}
        onChange={formBindings.setAllowGames}
      />
      <AiTutorSelectFieldRow
        config={{
          id: testAccessModeFieldId,
          value: formBindings.formState.testAccessMode,
          onChange: (event) =>
            formBindings.setTestAccessMode(event.target.value as KangurAiTutorTestAccessMode),
          label: parentDashboardContent.selects.testAccessModeLabel,
          description: parentDashboardContent.selects.testAccessModeDescription,
          disabled: controlsDisabled,
          children: (
            <>
              <option value='disabled'>{parentDashboardContent.selects.testAccessModeDisabled}</option>
              <option value='guided'>{parentDashboardContent.selects.testAccessModeGuided}</option>
              <option value='review_after_answer'>
                {parentDashboardContent.selects.testAccessModeReview}
              </option>
            </>
          ),
        }}
      />
      <div className='grid kangur-panel-gap min-[420px]:grid-cols-2'>
        <AiTutorSelectFieldRow
          config={{
            id: hintDepthFieldId,
            value: formBindings.formState.hintDepth,
            onChange: (event) =>
              formBindings.setHintDepth(event.target.value as KangurAiTutorHintDepth),
            label: parentDashboardContent.selects.hintDepthLabel,
            description: parentDashboardContent.selects.hintDepthDescription,
            disabled: controlsDisabled,
            children: (
              <>
                <option value='brief'>{parentDashboardContent.selects.hintDepthBrief}</option>
                <option value='guided'>{parentDashboardContent.selects.hintDepthGuided}</option>
                <option value='step_by_step'>
                  {parentDashboardContent.selects.hintDepthStepByStep}
                </option>
              </>
            ),
          }}
        />
        <AiTutorSelectFieldRow
          config={{
            id: proactiveNudgesFieldId,
            value: formBindings.formState.proactiveNudges,
            onChange: (event) =>
              formBindings.setProactiveNudges(
                event.target.value as KangurAiTutorProactiveNudges
              ),
            label: parentDashboardContent.selects.proactiveNudgesLabel,
            description: parentDashboardContent.selects.proactiveNudgesDescription,
            disabled: controlsDisabled,
            children: (
              <>
                <option value='off'>{parentDashboardContent.selects.proactiveNudgesOff}</option>
                <option value='gentle'>{parentDashboardContent.selects.proactiveNudgesGentle}</option>
                <option value='coach'>{parentDashboardContent.selects.proactiveNudgesCoach}</option>
              </>
            ),
          }}
        />
      </div>
      <TutorToggleField
        checked={formBindings.formState.showSources}
        disabled={controlsDisabled}
        label={parentDashboardContent.toggles.showSourcesLabel}
        description={parentDashboardContent.toggles.showSourcesDescription}
        onChange={formBindings.setShowSources}
      />
      <TutorToggleField
        checked={formBindings.formState.allowSelectedTextSupport}
        disabled={controlsDisabled}
        label={parentDashboardContent.toggles.allowSelectedTextSupportLabel}
        description={parentDashboardContent.toggles.allowSelectedTextSupportDescription}
        onChange={formBindings.setAllowSelectedTextSupport}
      />
      <TutorToggleField
        checked={formBindings.formState.allowCrossPagePersistence}
        disabled={controlsDisabled}
        label={parentDashboardContent.toggles.allowCrossPagePersistenceLabel}
        description={parentDashboardContent.toggles.allowCrossPagePersistenceDescription}
        onChange={formBindings.setAllowCrossPagePersistence}
      />
      <TutorToggleField
        checked={formBindings.formState.rememberTutorContext}
        disabled={controlsDisabled || !formBindings.formState.allowCrossPagePersistence}
        label={parentDashboardContent.toggles.rememberTutorContextLabel}
        description={parentDashboardContent.toggles.rememberTutorContextDescription}
        onChange={formBindings.setRememberTutorContext}
      />
    </div>
  );
}

export function AiTutorUiModeSection(): React.JSX.Element {
  const {
    controlsDisabled,
    formBindings,
    tutorContent,
    uiModeFieldId,
  } = useAiTutorConfigPanel();
  const { parentDashboard: parentDashboardContent } = tutorContent;

  return (
    <AiTutorSelectFieldRow
      config={{
        id: uiModeFieldId,
        value: formBindings.formState.uiMode,
        onChange: (event) =>
          formBindings.setUiMode(event.target.value as KangurAiTutorUiMode),
        label: parentDashboardContent.selects.uiModeLabel,
        description: parentDashboardContent.selects.uiModeDescription,
        disabled: controlsDisabled,
        children: (
          <>
            <option value='anchored'>{parentDashboardContent.selects.uiModeAnchored}</option>
            <option value='freeform'>{parentDashboardContent.selects.uiModeFreeform}</option>
            <option value='static'>{parentDashboardContent.selects.uiModeStatic}</option>
          </>
        ),
      }}
    />
  );
}

export function AiTutorSaveAction(): React.JSX.Element {
  const {
    actionClasses,
    feedback,
    handleSave,
    isSaving,
    isTemporarilyDisabled,
    tutorContent,
  } = useAiTutorConfigPanel();
  const { parentDashboard: parentDashboardContent } = tutorContent;
  const { fullWidthActionClassName } = actionClasses;

  return (
    <>
      <KangurButton
        type='button'
        variant='primary'
        size='sm'
        onClick={() => void handleSave()}
        disabled={isSaving || isTemporarilyDisabled}
        fullWidth
        className={fullWidthActionClassName}
      >
        {isSaving
          ? parentDashboardContent.savePendingLabel
          : parentDashboardContent.saveIdleLabel}
      </KangurButton>

      {feedback ? (
        <p
          className='text-xs text-center [color:var(--kangur-page-muted-text)]'
          role='status'
          aria-live='polite'
        >
          {feedback}
        </p>
      ) : null}
    </>
  );
}

export function AiTutorConfiguredPanel(): React.JSX.Element {
  const state = useAiTutorConfigPanel();
  const parentDashboardContent = state.tutorContent.parentDashboard;

  return (
    <KangurSurfacePanel accent='amber' padding='lg' className='w-full'>
      <KangurPanelStack>
        <AiTutorPanelHeader
          title={state.learnerHeaderTitle ?? parentDashboardContent.noActiveLearner}
        />
        <AiTutorMoodSection />
        <AiTutorUsageSection />
        <AiTutorAvailabilityRow />
        <AiTutorGuardrailsSection />
        <AiTutorUiModeSection />
        <AiTutorSaveAction />
      </KangurPanelStack>
    </KangurSurfacePanel>
  );
}

// Importing the hook would create a circular dependency if AiTutorConfigPanel used it here.
// But we can pass the state as a prop or keep the component in the main file.
// The prompt said "functions starting with AiTutor* or Tutor* that are not the main widget".
// So I will move AiTutorConfigPanel here but it will need the state passed in if I want to avoid circular deps.
// Or I can keep the hook in a separate file too.

export function AiTutorConfigPanel({
  state
}: {
  state: AiTutorConfigPanelState;
}): React.JSX.Element | null {
  return (
    <AiTutorConfigPanelContext.Provider value={state}>
      {state.activeLearner ? <AiTutorConfiguredPanel /> : <AiTutorNoActiveLearnerPanel />}
    </AiTutorConfigPanelContext.Provider>
  );
}
